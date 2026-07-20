import { useState, useEffect, useMemo, useRef } from "react";

/* ============================================================
   THE COLORADO TRAIL ATLAS — v7
   USGS quad-sheet aesthetic. v7: the map now behaves like
   full Google Maps — one finger (or mouse drag) pans, plain
   scroll wheel zooms at the cursor, pinch zooms, flings glide
   with inertia, double-tap/double-click zooms with animation,
   and double-tap-then-drag gives one-handed zoom. Quick-jumps
   and zoom buttons animate smoothly. Plus in-season filter,
   area passport stamps, sunrise/sunset, drive-time rings.
   ============================================================ */

/* ---------- AREAS (POIs + weather regions) ---------- */
const AREAS = {
  lakewood: {
    label: "Lakewood / Green Mtn", lat: 39.70, lon: -105.12,
    brew: [
      { n: "WestFax Brewing", d: "40 West Arts District" },
      { n: "Green Mountain Beer Co.", d: "Closest pint to the trail" },
      { n: "Landlocked Ales", d: "Colfax taproom + patio" },
    ],
    eat: [
      { n: "Casa Bonita", d: "Cliff divers. You know the one." },
      { n: "Edgewater Public Market", d: "Food hall 5 min from Sloan's Lake" },
      { n: "US Thai Cafe", d: "Edgewater strip-mall gem" },
    ],
  },
  golden: {
    label: "Golden", lat: 39.756, lon: -105.221,
    brew: [
      { n: "New Terrain Brewing", d: "At the base of North Table" },
      { n: "Cannonball Creek Brewing", d: "Hop-forward, GABF regular" },
      { n: "Golden City Brewery", d: "\u201CSecond largest brewery in Golden\u201D" },
    ],
    eat: [
      { n: "Sherpa House", d: "Nepali buffet, hiker fuel" },
      { n: "Bob's Atomic Burgers", d: "Order at the window" },
      { n: "D'Deli", d: "Monster sandwiches on Washington" },
    ],
  },
  boulder: {
    label: "Boulder", lat: 40.015, lon: -105.271,
    brew: [
      { n: "Avery Brewing Co.", d: "Gunbarrel · big taproom + kitchen" },
      { n: "Sanitas Brewing Co.", d: "East Boulder · taco truck on site" },
      { n: "Upslope Brewing (Flatiron Park)", d: "Classic post-hike patio" },
    ],
    eat: [
      { n: "The Sink", d: "Pearl St. institution since 1923" },
      { n: "Sherpa's Adventurers Restaurant", d: "Nepali/Indian, hiker HQ" },
      { n: "Foolish Craig's Cafe", d: "Crepes + burgers on Pearl" },
    ],
  },
  morrison: {
    label: "Morrison", lat: 39.653, lon: -105.191,
    brew: [
      { n: "Red Rocks Beer Garden", d: "Steps from the Morrison strip" },
      { n: "Lariat Lodge Brewing", d: "Evergreen · 15 min up the hill" },
      { n: "Green Mountain Beer Co.", d: "Lakewood · on the way home" },
    ],
    eat: [
      { n: "The Fort", d: "Old-West game meats, adobe fort" },
      { n: "Morrison Holiday Bar", d: "Dive-bar burgers + patio" },
      { n: "Cafe Prague", d: "Czech comfort food in town" },
    ],
  },
  evergreen: {
    label: "Evergreen", lat: 39.633, lon: -105.317,
    brew: [
      { n: "Lariat Lodge Brewing", d: "Evergreen's brewpub" },
      { n: "El Rancho Brewing", d: "Historic roadhouse off I-70" },
      { n: "Red Rocks Beer Garden", d: "Morrison · 20 min east" },
    ],
    eat: [
      { n: "Wildflower Cafe", d: "Main St. breakfast favorite" },
      { n: "Cactus Jack's Saloon", d: "Biker-bar burgers + live music" },
      { n: "Willow Creek Restaurant", d: "Nicer dinner option" },
    ],
  },
  littleton: {
    label: "Littleton / Roxborough", lat: 39.55, lon: -105.03,
    brew: [
      { n: "Breckenridge Brewery Farm House", d: "Big riverside campus" },
      { n: "Living the Dream Brewing", d: "Ski-themed taproom" },
      { n: "Locavore Beer Works", d: "Downtown Littleton" },
    ],
    eat: [
      { n: "Angelo's Taverna", d: "Oysters + pizza, Littleton" },
      { n: "Romano's Pizzeria", d: "Old-school institution" },
      { n: "Toast", d: "Downtown Littleton brunch" },
    ],
  },
  sedalia: {
    label: "Sedalia / Rampart Range", lat: 39.30, lon: -105.05,
    brew: [
      { n: "105 West Brewing", d: "Castle Rock" },
      { n: "Rockyard Brewing", d: "Castle Rock brewpub" },
      { n: "Burly Brewing", d: "Castle Rock · big taproom" },
    ],
    eat: [
      { n: "Bud's Cafe & Bar", d: "Sedalia · cash-only burgers, no fries, no debate" },
      { n: "Sedalia Grill", d: "Green chile + patio" },
      { n: "Castle Cafe", d: "Castle Rock pan-fried chicken" },
    ],
  },
  idahosprings: {
    label: "Idaho Springs", lat: 39.742, lon: -105.513,
    brew: [
      { n: "Westbound & Down Brewing", d: "Downtown Idaho Springs" },
      { n: "Tommyknocker Brewery", d: "Miner-themed brewpub" },
      { n: "Cabin Creek Brewing", d: "Georgetown · 15 min west" },
    ],
    eat: [
      { n: "Beau Jo's", d: "The original mountain pie" },
      { n: "Two Brothers Deli", d: "Sandwiches + breakfast burritos" },
      { n: "Smokin Yard's BBQ", d: "Ribs + patio on the creek" },
    ],
  },
  georgetown: {
    label: "Georgetown / Guanella", lat: 39.706, lon: -105.697,
    brew: [
      { n: "Guanella Pass Brewing Co.", d: "Right in Georgetown" },
      { n: "Cabin Creek Brewing", d: "Georgetown lakefront" },
      { n: "Westbound & Down", d: "Idaho Springs · award-winning IPAs" },
    ],
    eat: [
      { n: "Cooper's on the Creek", d: "Creekside patio, Georgetown" },
      { n: "Dusty Rose Cafe", d: "Breakfast before the pass" },
      { n: "Beau Jo's", d: "Idaho Springs · CO mountain pie" },
    ],
  },
  estes: {
    label: "Estes Park / RMNP", lat: 40.377, lon: -105.522,
    brew: [
      { n: "Rock Cut Brewing Co.", d: "Locals' pick, food trucks" },
      { n: "Lumpy Ridge Brewing Co.", d: "Funky taproom in an old gas station" },
      { n: "Estes Park Brewery", d: "Pizza + pool tables" },
    ],
    eat: [
      { n: "Bird & Jim", d: "Colorado-sourced, mountain views" },
      { n: "Ed's Cantina & Grill", d: "Post-hike margs + tacos" },
      { n: "Smokin' Dave's BBQ", d: "Brisket and wings, casual" },
    ],
  },
  breck: {
    label: "Breckenridge / Summit", lat: 39.481, lon: -106.038,
    brew: [
      { n: "Broken Compass Brewing", d: "Coconut porter, locals' spot" },
      { n: "Breckenridge Brewery & Pub", d: "Main St. original location" },
      { n: "HighSide Brewing", d: "Frisco · Main St. taproom" },
    ],
    eat: [
      { n: "The Crown", d: "Cafe + sandwiches on Main" },
      { n: "Empire Burger", d: "Post-summit burger + shakes" },
      { n: "Blue Moose Pizza", d: "Big slices, casual" },
    ],
  },
  vail: {
    label: "Vail Valley", lat: 39.640, lon: -106.374,
    brew: [
      { n: "Vail Brewing Co.", d: "Eagle-Vail + Vail Village taprooms" },
      { n: "Gore Range Brewery", d: "Edwards · full menu" },
      { n: "Vail Brewhouse", d: "On Bridge St. in the village" },
    ],
    eat: [
      { n: "Westside Cafe", d: "Legendary breakfast burritos" },
      { n: "Blue Moose Pizza", d: "Vail Village slices" },
      { n: "Vendetta's", d: "Late-night pizza + patio" },
    ],
  },
  springs: {
    label: "Colorado Springs / Manitou", lat: 38.858, lon: -104.916,
    brew: [
      { n: "Manitou Brewing Co.", d: "Blocks from the Incline" },
      { n: "Cerberus Brewing Co.", d: "West side, full kitchen" },
      { n: "Red Leg Brewing Co.", d: "Veteran-owned, big campus" },
    ],
    eat: [
      { n: "Adam's Mountain Cafe", d: "Manitou · healthy + hearty" },
      { n: "The Loop", d: "Manitou margaritas since 1948" },
      { n: "Shuga's", d: "Springs · soups + sangria" },
    ],
  },
  glenwood: {
    label: "Glenwood Springs", lat: 39.545, lon: -107.324,
    brew: [
      { n: "Casey Brewing Taproom", d: "Wild ales, downtown" },
      { n: "Glenwood Canyon Brewpub", d: "By the hot springs" },
      { n: "Roaring Fork Beer Co.", d: "Carbondale · 20 min south" },
    ],
    eat: [
      { n: "Slope & Hatch", d: "Tacos + hot dogs, post-hike" },
      { n: "The Pullman", d: "Elevated but relaxed dinner" },
      { n: "Daily Bread Cafe", d: "Breakfast before the trail" },
    ],
  },
  aspen: {
    label: "Aspen", lat: 39.191, lon: -106.818,
    brew: [
      { n: "Aspen Brewing Co. Tap Room", d: "Downtown Aspen" },
      { n: "Capitol Creek Brewery", d: "Basalt · 25 min down valley" },
      { n: "Roaring Fork Beer Co.", d: "Carbondale · worth the drive" },
    ],
    eat: [
      { n: "White House Tavern", d: "Crispy chicken sandwich, cozy" },
      { n: "Big Wrap", d: "Cheap, fast, hiker fuel" },
      { n: "Meat & Cheese", d: "Farm shop + restaurant" },
    ],
  },
  dunes: {
    label: "Great Sand Dunes / Alamosa", lat: 37.469, lon: -105.870,
    brew: [
      { n: "San Luis Valley Brewing Co.", d: "Alamosa · 35 min" },
      { n: "Square Peg Brewerks", d: "Alamosa taproom" },
      { n: "Three Barrel Brewing", d: "Del Norte · wood-fired pizza" },
    ],
    eat: [
      { n: "The Oasis Restaurant", d: "At the park entrance, seasonal" },
      { n: "Calvillo's Mexican", d: "Alamosa buffet, hiker portions" },
      { n: "San Luis Valley Pizza Co.", d: "Alamosa · post-dune carbs" },
    ],
  },
  ouray: {
    label: "Ouray / Ridgway", lat: 38.153, lon: -107.756,
    brew: [
      { n: "Ouray Brewery", d: "Rooftop swing seats on Main" },
      { n: "Colorado Boy Pub & Brewery", d: "Ridgway · pizza + pints" },
      { n: "Red Mountain Brewing", d: "Ouray brewpub with full menu" },
    ],
    eat: [
      { n: "Taco del Gnar", d: "Ridgway · inventive tacos" },
      { n: "Brickhouse 737", d: "Ouray · upscale mountain fare" },
      { n: "Kate's Place", d: "Ridgway breakfast staple" },
    ],
  },
  telluride: {
    label: "Telluride", lat: 37.937, lon: -107.812,
    brew: [
      { n: "Telluride Brewing Co.", d: "Face Down Brown, west of town" },
      { n: "Smugglers Union", d: "Brewpub in town" },
      { n: "Colorado Boy", d: "Ridgway · 45 min, on the way out" },
    ],
    eat: [
      { n: "Brown Dog Pizza", d: "Detroit-style, apres classic" },
      { n: "Butcher & the Baker", d: "Breakfast + sandwiches" },
      { n: "The New Fat Alley BBQ", d: "Cheap BBQ + whiskey" },
    ],
  },
  silverton: {
    label: "Silverton / Lake City", lat: 37.812, lon: -107.664,
    brew: [
      { n: "Avalanche Brewing Co.", d: "Silverton · beer + pizza" },
      { n: "Golden Block Brewery", d: "Silverton Main St." },
      { n: "Ouray Brewery", d: "40 min over Red Mountain Pass" },
    ],
    eat: [
      { n: "Handlebars Food & Saloon", d: "Mining-camp decor, big plates" },
      { n: "Coffee Bear", d: "Breakfast + burritos to go" },
      { n: "Thee Pitts Again", d: "BBQ on Greene St." },
    ],
  },
  durango: {
    label: "Durango", lat: 37.273, lon: -107.880,
    brew: [
      { n: "Ska Brewing", d: "Modus Hoperandi HQ + The Container kitchen" },
      { n: "Steamworks Brewing", d: "Downtown brewpub, cajun boil" },
      { n: "Carver Brewing Co.", d: "Main Ave, breakfast-to-beer" },
    ],
    eat: [
      { n: "James Ranch Market Grill", d: "Ranch burgers north of town" },
      { n: "Durango Diner", d: "Green chile smothers everything" },
      { n: "Grassburger", d: "Quick grass-fed post-hike stop" },
    ],
  },
  cortez: {
    label: "Cortez / Mesa Verde", lat: 37.349, lon: -108.585,
    brew: [
      { n: "WildEdge Brewing Collective", d: "Downtown Cortez taproom" },
      { n: "Main Street Brewery", d: "Cortez brewpub since '95" },
      { n: "Dolores River Brewery", d: "Dolores · wood-fired pizza" },
    ],
    eat: [
      { n: "The Farm Bistro", d: "Local-sourced lunch in Cortez" },
      { n: "Loungin' Lizard", d: "Main St. sandwiches + green chile" },
      { n: "Pepperhead", d: "Southwest plates, hiker portions" },
    ],
  },
  pagosa: {
    label: "Pagosa Springs", lat: 37.2694, lon: -107.0098,
    brew: [
      { n: "Riff Raff Brewing", d: "Geothermal-powered pub downtown" },
      { n: "Pagosa Brewing & Grill", d: "Poor Richard's Ale + big patio" },
      { n: "Snowy Peaks Brewing", d: "Newer taproom on the east side" },
    ],
    eat: [
      { n: "Kip's Grill", d: "Tacos + green chile, apres staple" },
      { n: "The Rose", d: "Downtown breakfast before the trail" },
      { n: "Riff Raff on the Rio", d: "Riverside patio, full menu" },
    ],
  },
};

/* Area keys — display order is computed at runtime, nearest-first from the chosen starting point */
const AREA_KEYS = Object.keys(AREAS);

/* ---------- STARTING POINTS + DRIVE-TIME ESTIMATES ---------- */
const START_PRESETS = [
  { key: "sloans", label: "Sloan's Lake", lat: 39.7486, lon: -105.0452 },
  { key: "denver", label: "Downtown Denver", lat: 39.7392, lon: -104.9903 },
  { key: "golden", label: "Golden", lat: 39.7555, lon: -105.2211 },
  { key: "boulder", label: "Boulder", lat: 40.0150, lon: -105.2705 },
  { key: "springs", label: "Colorado Springs", lat: 38.8339, lon: -104.8214 },
  { key: "breck", label: "Breckenridge", lat: 39.4817, lon: -106.0384 },
  { key: "gwood", label: "Glenwood Springs", lat: 39.5505, lon: -107.3248 },
  { key: "durango", label: "Durango", lat: 37.2753, lon: -107.8801 },
  { key: "pagosa", label: "Pagosa Springs", lat: 37.2694, lon: -107.0098 },
];

function haversineMi(aLat, aLon, bLat, bLon) {
  const R = 3958.8, d = Math.PI / 180;
  const dLat = (bLat - aLat) * d, dLon = (bLon - aLon) * d;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * d) * Math.cos(bLat * d) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
/* Rough mountain-road model: 1.3× straight-line at ~48 mph effective, +8 min to get moving. */
function driveMin(start, area) {
  if (!start || !area) return null;
  const road = haversineMi(start.lat, start.lon, area.lat, area.lon) * 1.3;
  return Math.round(8 + (road / 48) * 60);
}
function fmtDrive(min) {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min / 5) * 5} min`;
  const h = Math.floor(min / 60), m = Math.round((min % 60) / 5) * 5;
  return m === 0 || m === 60 ? `${m === 60 ? h + 1 : h} hr` : `${h} hr ${m}`;
}

/* ---------- SEASON PARSING ---------- */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/* Parse strings like "Jul–Sep", "Mar–Jun, Sep–Nov", "Year-round (…)", "Sep–May" (wraps the year). */
function inSeason(prime, month) {
  const txt = prime.toLowerCase();
  if (txt.includes("year-round")) return true;
  return txt.split(",").some((seg) => {
    const found = [];
    MONTHS.forEach((m, i) => {
      const at = seg.indexOf(m);
      if (at >= 0) found.push({ i: i + 1, at });
    });
    if (!found.length) return false;
    found.sort((a, b) => a.at - b.at);
    const a = found[0].i, b = found[found.length - 1].i;
    return a <= b ? month >= a && month <= b : month >= a || month <= b;
  });
}
const MONTH_LBL = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_NOW = new Date().getMonth() + 1;

/* ---------- SUNRISE / SUNSET (NOAA approximation, no API) ---------- */
function sunTimes(lat, lon, date = new Date()) {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588, J2000 = 2451545;
  const toJulian = (d) => d.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
  const lw = -lon * rad, phi = lat * rad;
  const d = toJulian(date) - J2000;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(L) * 0.39778);
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH < -1 || cosH > 1) return null;
  const H = Math.acos(cosH);
  const Jset = J2000 + (0.0009 + (H + lw) / (2 * Math.PI) + n) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  const fmt = (dt) => dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
  return { rise: fmt(fromJulian(Jrise)), set: fmt(fromJulian(Jset)) };
}

/* ---------- TRAILS (38, curated) ---------- */
const TRAILS = [
  /* --- Denver metro & foothills --- */
  { id: "greenmtn", name: "Green Mountain Loop", area: "lakewood", lat: 39.6940, lon: -105.1470,
    th: "Florida Dr TH, Hayden Park, Lakewood", vehicle: "2WD", vroad: "Paved neighborhood lot",
    mi: 6.4, type: "Loop", diff: "Moderate", views: 3, gain: 1000, gainR: "Steady",
    arrive: "Before 8 AM in summer — zero shade", prime: "Mar–Jun, Sep–Nov", avoid: "Hot afternoons; gumbo mud after storms; watch for rattlesnakes" },
  { id: "ntable", name: "North Table Mountain Loop", area: "golden", lat: 39.7852, lon: -105.2270,
    th: "North Table Mtn TH, CO-93, Golden", vehicle: "2WD", vroad: "Paved lot right off 93 — fills weekend mornings",
    mi: 8.0, type: "Loop", diff: "Moderate", views: 3, gain: 1100, gainR: "One steep ramp, then mesa-flat",
    arrive: "Before 8 AM", prime: "Year-round", avoid: "Summer midday (exposed basalt oven); spring raptor closures on the cliffs" },
  { id: "galbraith", name: "Mount Galbraith Loop", area: "golden", lat: 39.7638, lon: -105.2570,
    th: "Galbraith TH, Golden Gate Canyon Rd", vehicle: "2WD", vroad: "Paved lot, small",
    mi: 4.2, type: "Lollipop loop", diff: "Moderate", views: 3, gain: 1100, gainR: "Steady",
    arrive: "Before 9 AM", prime: "Year-round", avoid: "Icy north-facing stretch in winter — bring spikes" },
  { id: "falcon", name: "Mount Falcon — Castle Trail", area: "morrison", lat: 39.6353, lon: -105.2390,
    th: "Mount Falcon East TH, Morrison", vehicle: "2WD", vroad: "Paved lot below the hogback",
    mi: 7.0, type: "Out & back", diff: "Moderate", views: 3, gain: 1700, gainR: "Steady",
    arrive: "Before 8 AM — little shade", prime: "Mar–Jun, Sep–Nov", avoid: "Summer afternoons; muddy freeze-thaw days" },
  { id: "tradingpost", name: "Red Rocks — Trading Post Trail", area: "morrison", lat: 39.6654, lon: -105.2057,
    th: "Trading Post lot, Red Rocks Park", vehicle: "2WD", vroad: "Paved park roads, free entry — lots close on show days",
    mi: 1.4, type: "Loop", diff: "Easy", views: 4, gain: 300, gainR: "Rolling",
    arrive: "Sunrise — the sandstone glows and the amphitheatre crowd hasn't landed", prime: "Year-round", avoid: "Concert afternoons/evenings (road + lot closures); slick clay after rain" },
  { id: "dakotaridge", name: "Dakota Ridge — Red Rocks Loop", area: "morrison", lat: 39.6780, lon: -105.1920,
    th: "Stegosaurus lot, Alameda Pkwy at C-470", vehicle: "2WD", vroad: "Paved lot shared with Dinosaur Ridge visitors",
    mi: 4.7, type: "Loop", diff: "Moderate", views: 4, gain: 1000, gainR: "Two climbs, hogback ridgeline between",
    arrive: "Before 8:30 AM", prime: "Mar–Jun, Sep–Nov", avoid: "Midday sun on the exposed hogback; watch for bikes on the ridge — real dinosaur tracks on the road section" },
  { id: "sisters", name: "Three Sisters & The Brother", area: "evergreen", lat: 39.6234, lon: -105.3450,
    th: "Alderfer/Three Sisters West TH", vehicle: "2WD", vroad: "Paved county lot",
    mi: 4.0, type: "Loop", diff: "Easy–Moderate", views: 3, gain: 800, gainR: "Mellow",
    arrive: "Anytime before 9 AM", prime: "Year-round", avoid: "Nothing serious — icy patches in winter" },
  { id: "bergen", name: "Bergen Peak", area: "evergreen", lat: 39.6395, lon: -105.3585,
    th: "Elk Meadow TH, Evergreen", vehicle: "2WD", vroad: "Paved lot on Stagecoach Blvd",
    mi: 9.4, type: "Out & back", diff: "Hard", views: 4, gain: 2000, gainR: "Long + steady",
    arrive: "Before 8 AM", prime: "Apr–Nov", avoid: "Hot afternoons on the lower meadow; icy summit switchbacks in winter" },
  { id: "chief", name: "Chief Mountain", area: "evergreen", lat: 39.6534, lon: -105.5320,
    th: "Mestaa'ėhehe (Squaw) Pass Rd pullout", vehicle: "2WD", vroad: "Paved — small roadside pullouts, arrive early",
    mi: 3.0, type: "Out & back", diff: "Moderate", views: 5, gain: 1000, gainR: "Efficient",
    arrive: "Morning — best summit-per-mile near Denver", prime: "Jun–Oct", avoid: "Afternoon lightning on the bald summit" },
  { id: "carpenter", name: "Carpenter Peak", area: "littleton", lat: 39.4290, lon: -105.0685,
    th: "Roxborough State Park", vehicle: "2WD", vroad: "Paved — state park pass; gates on fixed hours",
    mi: 6.4, type: "Out & back", diff: "Moderate", views: 4, gain: 1100, gainR: "Steady",
    arrive: "When the gate opens", prime: "Apr–Jun, Sep–Nov", avoid: "No dogs allowed; park closes at dusk; summer heat through the red rocks" },
  { id: "fountainvalley", name: "Fountain Valley Loop", area: "littleton", lat: 39.4325, lon: -105.0662,
    th: "Roxborough State Park visitor center", vehicle: "2WD", vroad: "Paved — state park pass; gates on fixed hours",
    mi: 2.4, type: "Loop", diff: "Easy", views: 4, gain: 250, gainR: "Gentle",
    arrive: "Gate opening — morning light on the red fins is the whole show", prime: "Year-round", avoid: "No dogs, no bikes; rattlesnakes sun on the trail in summer" },
  { id: "devilshead", name: "Devil's Head Lookout", area: "sedalia", lat: 39.2686, lon: -105.1015,
    th: "Devil's Head TH, Rampart Range Rd", vehicle: "2WD (dirt)", vroad: "9 mi of washboard dirt — fine for cars, rough on patience",
    mi: 2.8, type: "Out & back", diff: "Moderate", views: 5, gain: 950, gainR: "Steady + 143 stairs",
    arrive: "Before 9:30 AM weekends", prime: "Late May–Oct", avoid: "Road gates closed in winter; skip the fire-tower stairs in any storm" },
  { id: "royal-arch", name: "Royal Arch", area: "boulder", lat: 39.9992, lon: -105.2832,
    th: "Chautauqua Park, Boulder", vehicle: "2WD", vroad: "Paved city lot — fills by 8 AM weekends",
    mi: 3.4, type: "Out & back", diff: "Hard", views: 4, gain: 1400, gainR: "Steep",
    arrive: "Before 7:30 AM", prime: "Apr–Nov", avoid: "Summer midday heat; icy steps Dec–Mar (bring spikes)" },
  { id: "sanitas", name: "Mount Sanitas Loop", area: "boulder", lat: 40.0201, lon: -105.2973,
    th: "Sanitas Valley TH, Boulder", vehicle: "2WD", vroad: "Paved — small lot, street overflow",
    mi: 3.2, type: "Loop", diff: "Moderate", views: 3, gain: 1300, gainR: "Steep",
    arrive: "Before 8 AM", prime: "Mar–Nov", avoid: "Weekend mid-mornings (crowds); summer afternoons" },
  { id: "rainbowlakes", name: "Rainbow Lakes Trail", area: "boulder", lat: 40.0808, lon: -105.5628,
    th: "Rainbow Lakes TH, end of CR-116 off Peak to Peak Hwy (near Nederland)", vehicle: "2WD (dirt) · HC helps", vroad: "~5 mi of rough, rocky dirt (FR-298) — passable by careful 2WD when dry, slow going",
    mi: 4.2, type: "Out & back", diff: "Moderate", views: 4, gain: 750, gainR: "Gentle then rolling past the string of lakes",
    arrive: "Before 8:30 AM — small lot at the campground, shared with backpackers heading to Arapaho Glacier", prime: "Jul–Sep", avoid: "The access road when muddy or snow-covered (closed in winter); afternoon storms above treeline; mosquitoes in early July" },

  /* --- I-70 corridor & 14ers --- */
  { id: "stmarys", name: "St. Mary's Glacier", area: "idahosprings", lat: 39.8494, lon: -105.6470,
    th: "St. Mary's TH, Fall River Rd", vehicle: "2WD", vroad: "Paved — $20 cash paid lots, no roadside parking",
    mi: 1.6, type: "Out & back", diff: "Easy–Moderate", views: 4, gain: 700, gainR: "Short + rocky",
    arrive: "Before 9 AM weekends", prime: "Year-round (snowfield lingers)", avoid: "Glissading without traction; weekend middays" },
  { id: "herman", name: "Herman Gulch", area: "georgetown", lat: 39.7030, lon: -105.8540,
    th: "Herman Gulch TH, I-70 exit 218", vehicle: "2WD", vroad: "Paved lot right off the interstate",
    mi: 6.2, type: "Out & back", diff: "Moderate", views: 4, gain: 1700, gainR: "Steady",
    arrive: "Before 8 AM", prime: "Jul (wildflowers)–Sep", avoid: "Avalanche terrain in winter; afternoon storms above treeline" },
  { id: "bierstadt", name: "Mount Bierstadt (14er)", area: "georgetown", lat: 39.5966, lon: -105.7108,
    th: "Guanella Pass Summit", vehicle: "2WD", vroad: "Paved all the way — the most accessible 14er TH",
    mi: 7.0, type: "Out & back", diff: "Hard", views: 4, gain: 2850, gainR: "Strenuous",
    arrive: "5–5:30 AM", prime: "Jul–Sep", avoid: "Be off the summit by noon — lightning; Guanella Pass road closes in winter" },
  { id: "grays", name: "Grays & Torreys (2× 14ers)", area: "georgetown", lat: 39.6607, lon: -105.7845,
    th: "Stevens Gulch TH, Bakerville exit", vehicle: "AWD / High-clearance", vroad: "Last 3 mi is rocky, rutted dirt — 2WD sedans park at I-70 and add 6 mi",
    mi: 8.5, type: "Out & back", diff: "Hard", views: 5, gain: 3600, gainR: "Strenuous",
    arrive: "4:30–5:30 AM", prime: "Jul–Sep", avoid: "Afternoon storms; the road after heavy rain" },
  { id: "quandary", name: "Quandary Peak (14er)", area: "breck", lat: 39.3852, lon: -106.0664,
    th: "Quandary Peak TH, Blue Lakes Rd", vehicle: "2WD", vroad: "Paved — summer weekends require a parking reservation or shuttle",
    mi: 6.75, type: "Out & back", diff: "Hard", views: 4, gain: 3450, gainR: "Strenuous",
    arrive: "5 AM (or book the shuttle)", prime: "Jun–Sep", avoid: "East ridge in high wind; noon+ in monsoon season" },
  { id: "mohawk", name: "Mohawk Lakes", area: "breck", lat: 39.4320, lon: -106.0760,
    th: "Spruce Creek TH, Breckenridge", vehicle: "2WD lower · 4WD upper", vroad: "Lower lot is fine for cars; the 4WD spur cuts ~2 mi round trip",
    mi: 6.7, type: "Out & back", diff: "Moderate–Hard", views: 5, gain: 1700, gainR: "Steady then steep",
    arrive: "Before 7:30 AM", prime: "Jul–Sep", avoid: "Snowfields on the upper shelf into early July" },
  { id: "booth", name: "Booth Falls", area: "vail", lat: 39.6532, lon: -106.3200,
    th: "Booth Falls TH, East Vail", vehicle: "2WD", vroad: "Paved — summer parking restricted; free East Vail bus",
    mi: 4.0, type: "Out & back", diff: "Moderate", views: 4, gain: 1400, gainR: "Steep",
    arrive: "Before 8 AM or ride the bus", prime: "Jun–Sep (falls peak in June)", avoid: "Mud season (late Oct–Nov)" },

  /* --- RMNP --- */
  { id: "emerald", name: "Emerald Lake", area: "estes", lat: 40.3117, lon: -105.6457,
    th: "Bear Lake TH, RMNP", vehicle: "2WD", vroad: "Paved — RMNP timed-entry permit + park pass required",
    mi: 3.2, type: "Out & back", diff: "Easy–Moderate", views: 5, gain: 700, gainR: "Mellow",
    arrive: "Before 7 AM or ride the shuttle", prime: "Jun–Oct", avoid: "Midday without a timed permit; deep snow Nov–May (snowshoes)" },
  { id: "skypond", name: "Sky Pond", area: "estes", lat: 40.3103, lon: -105.6400,
    th: "Glacier Gorge TH, RMNP", vehicle: "2WD", vroad: "Paved — tiny lot, timed entry; Bear Lake shuttle backup",
    mi: 9.0, type: "Out & back", diff: "Hard", views: 5, gain: 1780, gainR: "Sustained",
    arrive: "5:30–6 AM", prime: "Jul–Sep", avoid: "Timberline Falls scramble when icy; afternoon storms" },
  { id: "chasm", name: "Chasm Lake", area: "estes", lat: 40.2720, lon: -105.5570,
    th: "Longs Peak TH", vehicle: "2WD", vroad: "Paved to the lot — no timed entry needed",
    mi: 8.4, type: "Out & back", diff: "Hard", views: 5, gain: 2540, gainR: "Strenuous",
    arrive: "4:30–5:30 AM (lot fills)", prime: "Jul–Sep", avoid: "Any monsoon afternoon — fully exposed above treeline" },
  { id: "deer", name: "Deer Mountain", area: "estes", lat: 40.3872, lon: -105.6100,
    th: "Deer Ridge Junction, RMNP", vehicle: "2WD", vroad: "Paved roadside — timed entry in summer",
    mi: 6.2, type: "Out & back", diff: "Moderate", views: 4, gain: 1210, gainR: "Steady",
    arrive: "Before 8 AM", prime: "May–Oct", avoid: "Afternoon lightning on the open summit" },

  /* --- Springs --- */
  { id: "incline", name: "Manitou Incline", area: "springs", lat: 38.8577, lon: -104.9325,
    th: "Ruxton Ave, Manitou Springs", vehicle: "2WD", vroad: "Free reservation required; park at Hiawatha Gardens + shuttle",
    mi: 0.9, type: "Up only (descend Barr Trail, +3 mi)", diff: "Very Hard", views: 4, gain: 2011, gainR: "2,000 ft in under a mile",
    arrive: "Dawn slot — beat the sun", prime: "Sep–May", avoid: "Summer midday (heatstroke territory); icy steps without spikes" },
  { id: "sevenbridges", name: "Seven Bridges", area: "springs", lat: 38.7890, lon: -104.8790,
    th: "North Cheyenne Cañon, upper lot", vehicle: "2WD", vroad: "Paved canyon road to a dirt lot",
    mi: 3.8, type: "Out & back", diff: "Moderate", views: 3, gain: 900, gainR: "Steady",
    arrive: "Before 9 AM weekends", prime: "Apr–Nov", avoid: "Creek crossings during spring runoff" },
  { id: "gog", name: "Garden of the Gods — Central Garden", area: "springs", lat: 38.8790, lon: -104.8780,
    th: "Main lot #10, Garden of the Gods", vehicle: "2WD", vroad: "Paved park roads, free entry",
    mi: 1.5, type: "Loop", diff: "Easy", views: 4, gain: 100, gainR: "Flat",
    arrive: "Sunrise for the red-rock glow", prime: "Year-round", avoid: "Midday tour-bus crush in summer" },

  /* --- Aspen / Glenwood --- */
  { id: "maroon", name: "Maroon Bells — Crater Lake", area: "aspen", lat: 39.0985, lon: -106.9410,
    th: "Maroon Lake Scenic Area", vehicle: "2WD", vroad: "Paved — vehicle reservation before 8 AM, else mandatory shuttle from Aspen Highlands",
    mi: 3.6, type: "Out & back", diff: "Moderate", views: 5, gain: 700, gainR: "Mellow",
    arrive: "First shuttle or a dawn vehicle slot", prime: "Late Jun–Jul (flowers), late Sep (gold)", avoid: "Showing up without a reservation mid-summer — you won't get in" },
  { id: "cathedral", name: "Cathedral Lake", area: "aspen", lat: 39.0086, lon: -106.8544,
    th: "Cathedral Lake TH, Castle Creek Rd", vehicle: "AWD / High-clearance", vroad: "Last 0.6 mi is rough, rutted dirt — careful sedans make it when dry",
    mi: 5.6, type: "Out & back", diff: "Hard", views: 5, gain: 2000, gainR: "Strenuous",
    arrive: "By 7 AM (small lot)", prime: "Jul–Sep", avoid: "The scree switchbacks when wet; snow lingers into July" },
  { id: "hanging", name: "Hanging Lake", area: "glenwood", lat: 39.6012, lon: -107.1920,
    th: "Glenwood Canyon rest area", vehicle: "2WD", vroad: "Paved — permit required year-round, book weeks ahead",
    mi: 3.0, type: "Out & back", diff: "Moderate", views: 5, gain: 1200, gainR: "Steep",
    arrive: "Your permit window — earliest is best", prime: "May–Oct", avoid: "No permit, no hike; icy footing in winter" },

  /* --- Sand Dunes --- */
  { id: "highdune", name: "High Dune on First Ridge", area: "dunes", lat: 37.7402, lon: -105.5180,
    th: "Dunes main lot, Great Sand Dunes NP", vehicle: "2WD", vroad: "Paved to the lot — park pass required",
    mi: 2.5, type: "Out & back (no fixed trail)", diff: "Moderate (sand)", views: 5, gain: 700, gainR: "Two steps up, one back",
    arrive: "Sunrise or 2 hrs before sunset", prime: "May–Jun (Medano Creek), Sep–Oct", avoid: "Summer midday — sand hits 150°F and burns paws and feet" },

  /* --- San Juans --- */
  { id: "bluelakes", name: "Blue Lakes (Mt. Sneffels)", area: "ouray", lat: 38.0334, lon: -107.8129,
    th: "Blue Lakes TH, East Dallas Creek Rd", vehicle: "AWD / High-clearance", vroad: "9 mi of washboard dirt — passable by careful 2WD when dry",
    mi: 8.6, type: "Out & back", diff: "Hard", views: 5, gain: 2500, gainR: "Strenuous",
    arrive: "By 7 AM", prime: "Jul–Sep (the water is unreal in Aug)", avoid: "Monsoon afternoons; the road after storms" },
  { id: "icelakes", name: "Ice Lakes Basin", area: "silverton", lat: 37.8065, lon: -107.7730,
    th: "South Mineral Campground TH", vehicle: "2WD (dirt)", vroad: "4.5 mi of graded dirt off US-550 — fine for most cars when dry",
    mi: 8.0, type: "Out & back", diff: "Hard", views: 5, gain: 2430, gainR: "Strenuous",
    arrive: "6–7 AM (tiny lot)", prime: "Mid-Jul–Sep", avoid: "Afternoon lightning — the basin is a lightning rod; check closures" },
  { id: "handies", name: "Handies Peak via American Basin (14er)", area: "silverton", lat: 37.9260, lon: -107.5110,
    th: "American Basin, Cinnamon Pass Rd", vehicle: "4WD required", vroad: "True 4WD road (Alpine Loop) — stock SUVs with clearance OK, no sedans",
    mi: 5.5, type: "Out & back", diff: "Hard", views: 5, gain: 2500, gainR: "Strenuous",
    arrive: "Sunrise in the basin", prime: "Mid-Jul–early Sep (wildflower heaven)", avoid: "Road opens late Jun at best; storms move fast above 12k" },
  { id: "bridalveil", name: "Bridal Veil Falls", area: "telluride", lat: 37.9225, lon: -107.7700,
    th: "End of CO-145 Spur, Telluride box canyon", vehicle: "2WD base · 4WD top", vroad: "Park at Pandora Mill and hike; the switchback road itself needs 4WD",
    mi: 3.6, type: "Out & back", diff: "Moderate", views: 5, gain: 1200, gainR: "Steady",
    arrive: "Before 9 AM in summer", prime: "Jun–Sep", avoid: "Festival weekends unless you like parking chaos" },

  /* --- Durango --- */
  { id: "animas", name: "Animas Mountain Loop", area: "durango", lat: 37.2970, lon: -107.8650,
    th: "32nd St TH, Durango", vehicle: "2WD", vroad: "Paved neighborhood lot at the end of 32nd",
    mi: 5.9, type: "Loop", diff: "Moderate", views: 4, gain: 1450, gainR: "Steady",
    arrive: "Before 8 AM — south-facing and hot", prime: "Mar–Jun, Sep–Nov", avoid: "Summer midday; slick clay after rain or snowmelt" },
  { id: "hogsback", name: "The Hogsback", area: "durango", lat: 37.2830, lon: -107.9050,
    th: "Perins Peak SWA, Leyden St, Durango", vehicle: "2WD", vroad: "Paved street parking at the edge of town",
    mi: 2.6, type: "Out & back", diff: "Hard", views: 4, gain: 900, gainR: "Short + brutally steep",
    arrive: "Sunrise or sunset — town-lights payoff", prime: "Year-round (as allowed)", avoid: "Seasonal wildlife closures in the SWA (check Dec–Jul rules); loose scramble when wet" },
  { id: "engineer", name: "Engineer Mountain", area: "durango", lat: 37.6990, lon: -107.7790,
    th: "Pass Creek TH, Coal Bank Pass, US-550", vehicle: "2WD", vroad: "Paved highway pullout at the pass",
    mi: 5.5, type: "Out & back", diff: "Hard", views: 5, gain: 2200, gainR: "Strenuous",
    arrive: "By 7 AM", prime: "Jul–Sep", avoid: "The exposed summit ridge in wind or storms — turn around at the saddle if weather builds" },
  { id: "spudlake", name: "Spud (Potato) Lake", area: "durango", lat: 37.6428, lon: -107.7565,
    th: "Old Lime Creek Rd, off US-550", vehicle: "2WD (dirt) · HC helps", vroad: "Rocky old stage road — slow going but most cars make it dry",
    mi: 3.4, type: "Out & back", diff: "Easy", views: 4, gain: 500, gainR: "Mellow",
    arrive: "Morning light on Engineer Mtn", prime: "Jun–Sep (gold aspens late Sep)", avoid: "The road after heavy rain; mosquito hatch in early July" },
  { id: "vallecito", name: "Vallecito Creek Trail", area: "durango", lat: 37.4776, lon: -107.5470,
    th: "Vallecito CG TH, north of Vallecito Res.", vehicle: "2WD", vroad: "Paved to gravel, any car",
    mi: 7.0, type: "Out & back (go as far as you like)", diff: "Moderate", views: 4, gain: 1100, gainR: "Gentle canyon grade",
    arrive: "Before 9 AM", prime: "May–Oct", avoid: "High-runoff crossings in late spring if you go deep" },

  /* --- Cortez / Mesa Verde (red-rock country west of Durango) --- */
  { id: "sandcanyon", name: "Sand Canyon Trail", area: "cortez", lat: 37.3900, lon: -108.8160,
    th: "Sand Canyon TH, Road G (McElmo Canyon)", vehicle: "2WD", vroad: "Paved to a slickrock lot — trail starts on bare sandstone",
    mi: 6.5, type: "Out & back (turn around anywhere)", diff: "Moderate", views: 5, gain: 700, gainR: "Rolling slickrock",
    arrive: "Morning — zero shade in the canyon", prime: "Mar–May, Sep–Nov", avoid: "Summer midday heat; don't touch or enter the ancestral Puebloan ruins — view from the trail" },
  { id: "petroglyph", name: "Petroglyph Point Trail", area: "cortez", lat: 37.1840, lon: -108.4880,
    th: "Chapin Mesa Museum, Mesa Verde NP", vehicle: "2WD", vroad: "Paved park road — entrance fee; register at the trailhead",
    mi: 2.4, type: "Loop", diff: "Moderate", views: 4, gain: 300, gainR: "Stone steps + narrow squeezes",
    arrive: "When the museum area opens", prime: "Apr–Oct", avoid: "Trail closes in winter and after storms; icy stone steps; not for tight-squeeze haters" },

  /* --- Pagosa Springs --- */
  { id: "treasurefalls", name: "Treasure Falls", area: "pagosa", lat: 37.4479, lon: -106.8956,
    th: "Treasure Falls lot, US-160 at Wolf Creek Pass", vehicle: "2WD", vroad: "Paved highway lot at the base of the pass",
    mi: 0.5, type: "Out & back", diff: "Easy", views: 4, gain: 250, gainR: "Short switchbacks",
    arrive: "Anytime — best mist at peak runoff", prime: "May–Jun (runoff), Sep–Oct (aspens)", avoid: "Icy misting bridge in winter; frozen-falls gawker traffic on 160" },
  { id: "fourmile", name: "Fourmile Falls", area: "pagosa", lat: 37.4485, lon: -107.0530,
    th: "Fourmile TH, end of Fourmile Rd (FR 645)", vehicle: "2WD (dirt)", vroad: "~9 mi of decent gravel north of town — fine for cars when dry",
    mi: 6.2, type: "Out & back", diff: "Moderate", views: 5, gain: 1000, gainR: "Gentle canyon grade, one push at the end",
    arrive: "Before 9 AM in summer", prime: "Jun (falls roar)–Sep", avoid: "Afternoon monsoon build-up; road snowed shut in winter" },
  { id: "piedrafalls", name: "Piedra Falls", area: "pagosa", lat: 37.4292, lon: -107.1970,
    th: "Piedra Falls TH, end of Middle Fork Rd", vehicle: "2WD (dirt)", vroad: "Long washboard gravel approach — slow but sedan-friendly dry",
    mi: 1.0, type: "Out & back", diff: "Easy", views: 4, gain: 150, gainR: "Mellow riverside walk",
    arrive: "Morning light hits the gorge best", prime: "May–Oct", avoid: "Slick rock ledges near the falls; the drive after heavy rain" },
];

/* ---------- WEATHER VERDICT ---------- */
function verdict(w) {
  if (!w) return null;
  const { hi, wind, precip } = w;
  if (precip >= 50 || wind >= 30 || hi <= 15 || hi >= 95) return "POOR";
  if (precip >= 30 || wind >= 20 || hi <= 25 || hi >= 88) return "FAIR";
  return "GOOD";
}
const VERDICT_TEXT = {
  GOOD: "Good day to hike",
  FAIR: "Hikeable — watch conditions",
  POOR: "Bad day — pick another trail",
};

/* ---------- STORAGE ---------- */
const LOG_KEY = "co-trail-log-v1";
const WX_KEY = "co-trail-wx-v1";
const START_KEY = "co-trail-start-v1";
const GPS_KEY = "co-trail-gps-v1";

/* ---------- DIRECTIONS ---------- */
/* Each option builds a driving-directions deep link to the trailhead's exact
   coordinates. "device" uses a geo: URI that hands off to whatever the user's
   phone has set as its default maps app. */
const GPS_APPS = [
  { key: "device", label: "Default maps app" },
  { key: "google", label: "Google Maps" },
  { key: "apple",  label: "Apple Maps" },
  { key: "waze",   label: "Waze" },
];
function directionsUrl(appKey, lat, lon, label) {
  const q = encodeURIComponent(label || "Trailhead");
  switch (appKey) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    case "apple":
      return `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d&q=${q}`;
    case "waze":
      return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    case "device":
    default:
      /* geo: with a plain lat,lon query — opens the OS default navigation app */
      return `geo:${lat},${lon}?q=${lat},${lon}(${q})`;
  }
}
async function loadKey(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function saveKey(key, obj) {
  try { await window.storage.set(key, JSON.stringify(obj)); } catch (e) { console.error(e); }
}

/* ---------- MAP PROJECTION ---------- */
const MAP_W = 760, MAP_H = 470;
const LON_MIN = -109.35, LON_MAX = -101.75, LAT_MIN = 36.82, LAT_MAX = 41.18;
const px = (lon) => ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W;
const py = (lat) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H;

const CONTOURS = [
  "M40,120 C120,90 180,140 260,110 C340,80 400,150 470,120",
  "M60,190 C140,160 200,210 280,180 C360,150 420,220 500,190",
  "M30,270 C110,240 190,290 270,255 C350,225 430,295 510,260",
  "M80,340 C160,310 230,360 310,330 C390,300 460,365 540,335",
  "M300,70 C380,45 440,95 520,70 C600,45 650,100 720,80",
  "M480,300 C550,275 610,325 690,295",
  "M150,415 C230,390 300,435 380,410 C460,385 530,435 610,410",
];

const RANGE_LABELS = [
  { n: "FRONT RANGE", lat: 39.95, lon: -105.45, rot: -70 },
  { n: "SAWATCH", lat: 38.95, lon: -106.35, rot: -75 },
  { n: "SAN JUANS", lat: 37.65, lon: -107.55, rot: -12 },
  { n: "SANGRE DE CRISTO", lat: 37.85, lon: -105.45, rot: -55 },
];

/* ---------- SMALL PIECES ---------- */
function Stars({ n, max = 5, onSet, size = 14 }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i}
          className={"star " + (i < n ? "on" : "") + (onSet ? " tap" : "")}
          onClick={onSet ? () => onSet(i + 1 === n ? 0 : i + 1) : undefined}
        >★</span>
      ))}
    </span>
  );
}
function VerdictChip({ v, small }) {
  if (!v) return <span className="chip chip-na">{small ? "—" : "No forecast yet"}</span>;
  return <span className={"chip chip-" + v.toLowerCase()}>{small ? v : VERDICT_TEXT[v]}</span>;
}
function DiffTag({ d }) {
  const k = d.includes("Very") ? "vhard" : d.includes("Hard") ? "hard" : d.includes("Moderate") ? "mod" : "easy";
  return <span className={"diff diff-" + k}>{d}</span>;
}

/* ---------- ZOOMABLE QUAD MAP ---------- */
/* one jump per starting location — metro spots zoom tighter since markers cluster there */
const START_JUMPS = START_PRESETS.map((p) => ({
  ...p,
  k: ["sloans", "denver", "golden"].includes(p.key) ? 4.4 : 3.4,
}));

function QuadMap({ trails, log, wxFor, sel, onSelect, start, seasonOn, onToggleSeason, month }) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const svgRef = useRef(null);
  const viewRef = useRef(view);    // live view for animation frames + gesture math
  const ptrs = useRef(new Map());
  const pinch = useRef(null);      // last two-finger distance
  const lastMid = useRef(null);    // last two-finger midpoint (client coords)
  const dragDist = useRef(0);
  const lastTap = useRef(0);
  const touchDblZoom = useRef(0);  // suppress synthetic dblclick after touch double-tap
  const dtZoom = useRef(null);     // double-tap-and-drag one-finger zoom gesture
  const velSamples = useRef([]);   // recent pointer positions -> fling velocity
  const rafId = useRef(null);      // running inertia / zoom animation
  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const clampView = (v) => {
    const k = Math.min(9, Math.max(1, v.k));
    const x = Math.min(0, Math.max(MAP_W * (1 - k), v.x));
    const y = Math.min(0, Math.max(MAP_H * (1 - k), v.y));
    return { x, y, k };
  };

  /* single write path so gestures + animations never fight over stale state */
  const applyView = (v) => {
    const c = clampView(v);
    viewRef.current = c;
    setView(c);
  };

  const stopMotion = () => {
    cancelAnimationFrame(rafId.current);
    rafId.current = null;
  };

  const toSvg = (clientX, clientY) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * MAP_W, y: ((clientY - r.top) / r.height) * MAP_H };
  };

  const zoomAt = (sx, sy, factor) => {
    const v = viewRef.current;
    const k2 = Math.min(9, Math.max(1, v.k * factor));
    const scale = k2 / v.k;
    applyView({ k: k2, x: sx - (sx - v.x) * scale, y: sy - (sy - v.y) * scale });
  };

  /* animated zoom about a fixed anchor (double-click/tap, +/- buttons) */
  const animateZoomAt = (sx, sy, factor, dur = 240) => {
    stopMotion();
    const from = viewRef.current;
    const kTo = Math.min(9, Math.max(1, from.k * factor));
    if (kTo === from.k) return;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const k = from.k * Math.pow(kTo / from.k, e);
      const s = k / from.k;
      applyView({ k, x: sx - (sx - from.x) * s, y: sy - (sy - from.y) * s });
      if (p < 1) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  };

  /* animated pan + zoom to an arbitrary view (quick-jumps, reset) */
  const animateView = (target, dur = 340) => {
    stopMotion();
    const from = viewRef.current;
    const to = clampView(target);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      applyView({
        k: from.k * Math.pow(to.k / from.k, e),
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
      });
      if (p < 1) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  };

  /* release a drag with speed and the map glides to a stop */
  const startInertia = () => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const now = performance.now();
    const recent = velSamples.current.filter((s) => now - s.t < 110);
    if (recent.length < 2) return;
    const a = recent[0], b = recent[recent.length - 1];
    const dt = b.t - a.t;
    if (dt <= 0) return;
    let vx = ((b.x - a.x) / dt) * (MAP_W / r.width);   // svg units / ms
    let vy = ((b.y - a.y) / dt) * (MAP_H / r.height);
    if (Math.hypot(vx, vy) < 0.08) return;             // too slow — no fling
    stopMotion();
    let last = performance.now();
    const step = (t) => {
      const d = Math.min(50, t - last); last = t;
      const v = viewRef.current;
      applyView({ ...v, x: v.x + vx * d, y: v.y + vy * d });
      const decay = Math.exp(-d / 300);                // friction
      vx *= decay; vy *= decay;
      if (Math.hypot(vx, vy) > 0.01) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  };

  /* center a world point at a given zoom (region quick-jumps) */
  const flyTo = (lon, lat, k) => {
    animateView({ k, x: MAP_W / 2 - px(lon) * k, y: MAP_H / 2 - py(lat) * k });
  };

  /* plain scroll wheel / trackpad zooms toward the cursor, Google-Maps style
     (native non-passive listener so preventDefault can stop the page scroll) */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      stopMotion();
      const p = toSvg(e.clientX, e.clientY);
      /* exponential factor: smooth on trackpads, stepped feel on wheels */
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0022));
    };
    /* the map owns touch gestures now — block the page from scrolling or
       pinch-zooming when a drag starts on the map (touchstart is left alone
       so taps still synthesize clicks on the markers) */
    const onTouchMove = (e) => { e.preventDefault(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  /* gesture model — full Google Maps behavior on every input:
     mouse:  drag pans · scroll wheel zooms at the cursor · double-click zooms in
     touch:  one finger pans · fling glides with inertia · pinch pans + zooms ·
             double-tap zooms in · double-tap-then-drag = one-handed zoom
             (drag down zooms in, drag up zooms out)                          */
  const onPointerDown = (e) => {
    stopMotion();
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (ptrs.current.size === 1) {
      dragDist.current = 0;
      velSamples.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      const now = Date.now();
      if (e.pointerType === "touch" && now - lastTap.current < 300) {
        /* second tap — zoom on release, or hold + drag for continuous zoom */
        const p = toSvg(e.clientX, e.clientY);
        dtZoom.current = { sx: p.x, sy: p.y, startY: e.clientY, v0: { ...viewRef.current }, moved: false };
        touchDblZoom.current = now;
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
    if (ptrs.current.size === 2) {
      dtZoom.current = null;
      const [a, b] = [...ptrs.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      lastMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };
  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const prev = ptrs.current.get(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    if (ptrs.current.size === 1) {
      dragDist.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      /* double-tap-and-drag zoom, anchored where you tapped */
      if (dtZoom.current) {
        const z = dtZoom.current;
        if (Math.abs(e.clientY - z.startY) > 4) z.moved = true;
        const k2 = Math.min(9, Math.max(1, z.v0.k * Math.pow(2, (e.clientY - z.startY) / 160)));
        const s = k2 / z.v0.k;
        applyView({ k: k2, x: z.sx - (z.sx - z.v0.x) * s, y: z.sy - (z.sy - z.v0.y) * s });
        return;
      }
      /* one finger or mouse drag pans the map directly */
      velSamples.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (velSamples.current.length > 8) velSamples.current.shift();
      const dx = ((e.clientX - prev.x) / r.width) * MAP_W;
      const dy = ((e.clientY - prev.y) / r.height) * MAP_H;
      const v = viewRef.current;
      applyView({ ...v, x: v.x + dx, y: v.y + dy });
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      dragDist.current += 99; // a pinch is never a tap
      let next = viewRef.current;
      /* pan by midpoint delta */
      if (lastMid.current) {
        const dx = ((mid.x - lastMid.current.x) / r.width) * MAP_W;
        const dy = ((mid.y - lastMid.current.y) / r.height) * MAP_H;
        next = { ...next, x: next.x + dx, y: next.y + dy };
      }
      /* zoom about the midpoint */
      if (pinch.current) {
        const s = { x: ((mid.x - r.left) / r.width) * MAP_W, y: ((mid.y - r.top) / r.height) * MAP_H };
        const k2 = Math.min(9, Math.max(1, next.k * (d / pinch.current)));
        const scale = k2 / next.k;
        next = { k: k2, x: s.x - (s.x - next.x) * scale, y: s.y - (s.y - next.y) * scale };
      }
      applyView(next);
      pinch.current = d;
      lastMid.current = mid;
    }
  };
  const onPointerUp = (e) => {
    const wasSingle = ptrs.current.size === 1 && ptrs.current.has(e.pointerId);
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) { pinch.current = null; lastMid.current = null; }
    if (!wasSingle) return;
    if (dtZoom.current) {
      /* clean double-tap (no drag) = animated step zoom, like the real thing */
      if (!dtZoom.current.moved) animateZoomAt(dtZoom.current.sx, dtZoom.current.sy, 1.9);
      dtZoom.current = null;
    } else if (dragDist.current > 7) {
      startInertia(); // fling
    }
  };

  const { x, y, k } = view;
  const ms = 1 / Math.pow(k, 0.72); // marker inverse scale — stays readable while shrinking a bit
  const showLabels = k >= 1.8;
  const pick = (id) => { if (dragDist.current < 7) onSelect(id); };

  return (
    <div className="quad-wrap">
      <div className="quad-frame">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="quad"
          role="img"
          aria-label="Zoomable map of Colorado trails"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(e) => {
            if (Date.now() - touchDblZoom.current < 600) return; // already zoomed via touch double-tap
            const p = toSvg(e.clientX, e.clientY); animateZoomAt(p.x, p.y, 1.9);
          }}
          style={{ touchAction: "none" }}
        >
          <rect x="0" y="0" width={MAP_W} height={MAP_H} className="quad-paper" />
          <g transform={`translate(${x} ${y}) scale(${k})`}>
            {/* graticule */}
            {[-109, -108, -107, -106, -105, -104, -103, -102].map((ln) => (
              <line key={ln} x1={px(ln)} y1={0} x2={px(ln)} y2={MAP_H} className="grat" />
            ))}
            {[37, 38, 39, 40, 41].map((lt) => (
              <line key={lt} x1={0} y1={py(lt)} x2={MAP_W} y2={py(lt)} className="grat" />
            ))}
            {/* contour texture */}
            {CONTOURS.map((d, i) => <path key={i} d={d} className="contour" />)}
            {/* continental divide */}
            <path
              d={`M${px(-106.2)},${py(41.1)} C${px(-105.8)},${py(40.4)} ${px(-105.9)},${py(39.9)} ${px(-105.75)},${py(39.6)} C${px(-106.1)},${py(39.3)} ${px(-106.5)},${py(38.9)} ${px(-106.9)},${py(38.5)} C${px(-107.3)},${py(38.1)} ${px(-107.6)},${py(37.8)} ${px(-107.8)},${py(37.2)}`}
              className="divide"
            />
            {/* range labels */}
            {RANGE_LABELS.map((r) => (
              <text key={r.n} x={px(r.lon)} y={py(r.lat)} className="range-lbl"
                transform={`rotate(${r.rot} ${px(r.lon)} ${py(r.lat)})`}>{r.n}</text>
            ))}
            {/* reference cities */}
            {[
              { n: "DENVER", lat: 39.739, lon: -104.99 },
              { n: "CO SPRINGS", lat: 38.834, lon: -104.82 },
              { n: "GRAND JCT", lat: 39.064, lon: -108.55 },
              { n: "DURANGO", lat: 37.273, lon: -107.88 },
              { n: "PUEBLO", lat: 38.254, lon: -104.61 },
            ].map((c) => (
              <g key={c.n} transform={`translate(${px(c.lon)} ${py(c.lat)})`}>
                <g transform={`scale(${ms})`}>
                  <rect x="-2.6" y="-2.6" width="5.2" height="5.2" className="city" />
                  <text x="6" y="3.5" className="city-lbl">{c.n}</text>
                </g>
              </g>
            ))}
            {/* drive-time rings (1 / 2 / 4 hr from start, per the same rough road model) */}
            {start && [1, 2, 4].map((h) => {
              const mi = ((h * 60 - 8) / 60) * 48 / 1.3;
              const rx = (mi / (69 * Math.cos(start.lat * Math.PI / 180))) / (LON_MAX - LON_MIN) * MAP_W;
              const ry = (mi / 69) / (LAT_MAX - LAT_MIN) * MAP_H;
              return (
                <g key={h}>
                  <ellipse cx={px(start.lon)} cy={py(start.lat)} rx={rx} ry={ry} className="ring" />
                  <text x={px(start.lon)} y={py(start.lat) - ry - 3} className="ring-lbl">{h} HR</text>
                </g>
              );
            })}
            {/* starting point */}
            {start && (
              <g transform={`translate(${px(start.lon)} ${py(start.lat)})`}>
                <g transform={`scale(${ms})`}>
                  <path d="M0,-9 L2.6,-2.9 L9,-2.6 L4,1.6 L5.6,8 L0,4.4 L-5.6,8 L-4,1.6 L-9,-2.6 L-2.6,-2.9 Z" className="start-star" />
                  {showLabels && <text x="12" y="4" className="start-lbl">YOU · {start.label.toUpperCase()}</text>}
                </g>
              </g>
            )}
            {/* trail markers */}
            {trails.map((t) => {
              const v = verdict(wxFor(t));
              const done = !!log[t.id]?.done;
              const cls = "mark" + (v ? " mark-" + v.toLowerCase() : "") + (done ? " mark-done" : "") + (sel === t.id ? " mark-sel" : "");
              return (
                <g key={t.id} className={cls} transform={`translate(${px(t.lon)} ${py(t.lat)})`}
                  onClick={() => pick(t.id)} style={{ cursor: "pointer" }}>
                  <g transform={`scale(${ms})`}>
                    <title>{t.name}</title>
                    <circle r="13" className="mark-halo" />
                    <path d="M0,-8 L7.5,6 L-7.5,6 Z" className="mark-tri" />
                    {done && <text y="4.5" className="mark-check">✓</text>}
                    {showLabels && <text x="10" y="4" className="mark-lbl">{t.name}</text>}
                  </g>
                </g>
              );
            })}
          </g>
          {/* frame furniture on top */}
          <rect x="6" y="6" width={MAP_W - 12} height={MAP_H - 12} className="quad-border" />
          <text x={14} y={MAP_H - 15} className="quad-note">
            DRAG TO PAN · SCROLL OR PINCH TO ZOOM · DOUBLE-TAP ZOOMS · TAP A TRIANGLE FOR FIELD NOTES
          </text>
        </svg>
        <div className="zoom-ui">
          <button aria-label="Zoom in" className="zbtn" onClick={() => animateZoomAt(MAP_W / 2, MAP_H / 2, 1.5)}>+</button>
          <button aria-label="Zoom out" className="zbtn" onClick={() => animateZoomAt(MAP_W / 2, MAP_H / 2, 1 / 1.5)}>−</button>
          <button aria-label="Reset view" className="zbtn zbtn-reset" onClick={() => animateView({ x: 0, y: 0, k: 1 })}>⌂</button>
        </div>
      </div>
      <div className="quad-jumps">
        <span className="quad-jumps-lbl">JUMP TO —</span>
        {START_JUMPS.map((p) => (
          <button
            key={p.key}
            className={"jump-chip" + (start && start.key === p.key ? " jump-chip-active" : "")}
            aria-pressed={!!(start && start.key === p.key)}
            onClick={() => flyTo(p.lon, p.lat, p.k)}
          >
            {p.label.toUpperCase()}
          </button>
        ))}
        <button className="jump-chip" onClick={() => animateView({ x: 0, y: 0, k: 1 })}>FULL STATE</button>
        <label className="season-toggle" onClick={onToggleSeason}>
          <span className={"box season-box" + (seasonOn ? " box-on" : "")}>{seasonOn ? "✓" : ""}</span>
          IN SEASON ({MONTH_LBL[month - 1]})
        </label>
      </div>
      <div className="quad-key">
        <span><i className="k k-good" /> GOOD WX</span>
        <span><i className="k k-fair" /> FAIR</span>
        <span><i className="k k-poor" /> POOR</span>
        <span><i className="k k-done" /> LOGGED</span>
        <span><span className="k-star">★</span> START</span>
        <span className="quad-zoom-note">{Math.round(k * 100)}%</span>
      </div>
    </div>
  );
}

/* ---------- MAIN APP ---------- */
export default function ColoradoTrailAtlas() {
  const [log, setLog] = useState({});
  const [wx, setWx] = useState(null);
  const [wxBusy, setWxBusy] = useState(false);
  const [wxErr, setWxErr] = useState(null);
  const [sel, setSel] = useState(null);
  const [fDiff, setFDiff] = useState("All");
  const [fArea, setFArea] = useState("All");
  const [fDone, setFDone] = useState("All");
  const [seasonOn, setSeasonOn] = useState(false);
  const [start, setStart] = useState(START_PRESETS[0]);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState(null);
  const [gpsApp, setGpsApp] = useState("device");
  const saveTimer = useRef(null);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    (async () => {
      const l = await loadKey(LOG_KEY);
      if (l) setLog(l);
      const w = await loadKey(WX_KEY);
      if (w && Date.now() - w.ts < 1000 * 60 * 60 * 6) setWx(w);
      const s = await loadKey(START_KEY);
      if (s && s.lat && s.lon) setStart(s);
      const g = await loadKey(GPS_KEY);
      if (g && GPS_APPS.some((a) => a.key === g)) setGpsApp(g);
    })();
  }, []);

  const chooseStart = (s) => {
    setStart(s); setLocErr(null);
    saveKey(START_KEY, s);
  };
  const chooseGps = (k) => { setGpsApp(k); saveKey(GPS_KEY, k); };

  const locateMe = () => {
    if (!navigator.geolocation) { setLocErr("Location isn't available here — pick a town instead."); return; }
    setLocBusy(true); setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        chooseStart({ key: "gps", label: "My location", lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setLocBusy(false);
        setLocErr("Couldn't read your location — pick a town instead.");
      },
      { timeout: 8000 }
    );
  };

  const updateLog = (id, patch) => {
    setLog((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...patch } };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveKey(LOG_KEY, next), 500);
      return next;
    });
  };

  const refreshWeather = async () => {
    setWxBusy(true); setWxErr(null);
    /* Open-Meteo: free, no API key, works on the public web.
       One batched request for every area (lat/lon lists are comma-joined).
       Daily high/low, max wind gusts, and max precip probability, in °F / mph. */
    const entries = Object.entries(AREAS);
    const lats = entries.map(([, a]) => a.lat).join(",");
    const lons = entries.map(([, a]) => a.lon).join(",");
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${lats}&longitude=${lons}` +
      "&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max,weather_code" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDenver&forecast_days=1";

    /* WMO weather codes -> short human summary (<= a few words) */
    const wmo = (c) => {
      if (c === 0) return "Clear";
      if (c === 1 || c === 2) return "Partly cloudy";
      if (c === 3) return "Overcast";
      if (c === 45 || c === 48) return "Fog";
      if (c >= 51 && c <= 57) return "Drizzle";
      if (c >= 61 && c <= 67) return "Rain";
      if (c >= 71 && c <= 77) return "Snow";
      if (c >= 80 && c <= 82) return "Rain showers";
      if (c >= 85 && c <= 86) return "Snow showers";
      if (c >= 95) return "Thunderstorms";
      return "Mixed conditions";
    };

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather http " + res.status);
      const data = await res.json();
      /* Open-Meteo returns an array of location objects when multiple
         coordinates are requested; a single object if only one. Normalize. */
      const list = Array.isArray(data) ? data : [data];
      const byArea = {};
      entries.forEach(([key], i) => {
        const d = list[i]?.daily;
        if (!d) return;
        const hi = Math.round(d.temperature_2m_max?.[0]);
        const lo = Math.round(d.temperature_2m_min?.[0]);
        const gust = d.wind_gusts_10m_max?.[0];
        const spd = d.wind_speed_10m_max?.[0];
        const wind = Math.round(Math.max(gust ?? 0, spd ?? 0));
        const precip = Math.round(d.precipitation_probability_max?.[0] ?? 0);
        const summary = wmo(d.weather_code?.[0]);
        byArea[key] = { hi, lo, wind, precip, summary };
      });
      if (!Object.keys(byArea).length) throw new Error("no areas parsed");
      const payload = { ts: Date.now(), byArea };
      setWx(payload);
      saveKey(WX_KEY, payload);
    } catch (e) {
      console.error(e);
      setWxErr("Couldn't fetch a forecast — try again in a minute.");
    } finally {
      setWxBusy(false);
    }
  };

  const filtered = useMemo(() => TRAILS.filter((t) => {
    if (fDiff !== "All") {
      const bucket = t.diff.includes("Very") ? "Very Hard" : t.diff.includes("Hard") ? "Hard" : t.diff.includes("Moderate") ? "Moderate" : "Easy";
      if (bucket !== fDiff) return false;
    }
    if (fArea !== "All" && t.area !== fArea) return false;
    if (seasonOn && !inSeason(t.prime, MONTH_NOW)) return false;
    const done = !!log[t.id]?.done;
    if (fDone === "Done" && !done) return false;
    if (fDone === "Not yet" && done) return false;
    return true;
  }), [fDiff, fArea, fDone, seasonOn, log]);

  const grouped = useMemo(() => AREA_KEYS
    .map((key) => ({ key, area: AREAS[key], min: driveMin(start, AREAS[key]), trails: filtered.filter((t) => t.area === key) }))
    .filter((g) => g.trails.length > 0)
    .sort((a, b) => (a.min ?? 0) - (b.min ?? 0)), [filtered, start]);

  const trail = TRAILS.find((t) => t.id === sel);
  const doneCount = TRAILS.filter((t) => log[t.id]?.done).length;
  const wxFor = (t) => wx?.byArea?.[t.area] || null;

  return (
    <div className="atlas">
      <style>{CSS}</style>

      <header className="hd">
        <div className="hd-rule" />
        <div className="hd-main">
          <div className="hd-left">
            <div className="hd-eyebrow">STATE OF COLORADO · SURVEYED FOR RECREATION</div>
            <h1>THE COLORADO<br />TRAIL ATLAS</h1>
            <div className="hd-sub">{TRAILS.length} field-checked trails · logbook edition</div>
          </div>
          <div className="hd-right">
            <div className="hd-stat">
              <div className="hd-num">{doneCount}<span>/{TRAILS.length}</span></div>
              <div className="hd-lbl">TRAILS LOGGED</div>
            </div>
            <button className="wx-btn" onClick={refreshWeather} disabled={wxBusy}>
              {wxBusy ? "READING THE SKY…" : wx ? "REFRESH CONDITIONS" : "GET TODAY'S CONDITIONS"}
            </button>
            {wx && (
              <div className="wx-ts">forecast pulled {new Date(wx.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
            )}
            {wxErr && <div className="wx-err">{wxErr}</div>}
          </div>
        </div>
        <div className="hd-rule" />
      </header>

      <div className="startbar">
        <span className="legend-lbl">STARTING FROM —</span>
        <select
          value={start.key === "gps" ? "gps" : start.key}
          onChange={(e) => {
            if (e.target.value === "gps") { locateMe(); return; }
            const s = START_PRESETS.find((p) => p.key === e.target.value);
            if (s) chooseStart(s);
          }}
          aria-label="Starting point"
        >
          {START_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          <option value="gps">{start.key === "gps" ? "My location ✓" : "Use my location"}</option>
        </select>
        <span className="start-note">
          {locBusy ? "Finding you…" : locErr ? locErr : "Drive times below are rough estimates from here."}
        </span>
      </div>

      <div className="legend">
        <span className="legend-lbl">FILTER —</span>
        <select value={fDiff} onChange={(e) => setFDiff(e.target.value)} aria-label="Difficulty">
          {["All", "Easy", "Moderate", "Hard", "Very Hard"].map((d) => <option key={d}>{d === "All" ? "All difficulty" : d}</option>)}
        </select>
        <select value={fArea} onChange={(e) => setFArea(e.target.value)} aria-label="City or area">
          <option value="All">All cities</option>
          {AREA_KEYS
            .slice()
            .sort((a, b) => AREAS[a].label.localeCompare(AREAS[b].label))
            .map((k) => <option key={k} value={k}>{AREAS[k].label}</option>)}
        </select>
        <select value={fDone} onChange={(e) => setFDone(e.target.value)} aria-label="Completion">
          {["All", "Done", "Not yet"].map((d) => <option key={d}>{d === "All" ? "Done + not done" : d}</option>)}
        </select>
        <span className="legend-count">{filtered.length} shown</span>
      </div>

      <QuadMap trails={filtered} log={log} wxFor={wxFor} sel={sel} onSelect={setSel} start={start}
        seasonOn={seasonOn} onToggleSeason={() => setSeasonOn((v) => !v)} month={MONTH_NOW} />

      <div className="list-key">
        Each trail shows two tags: <b>difficulty</b> (Easy · Moderate · Hard) and
        today's <b>weather verdict</b> for that area (Good · Fair · Poor). Tap a trail for full field notes.
      </div>

      <div className="list">
        {grouped.map((g) => (
          <div key={g.key}>
            <div className="group-hd">
              <span className="group-name">{g.area.label.toUpperCase()}</span>
              {TRAILS.filter((t) => t.area === g.key).every((t) => log[t.id]?.done) && (
                <span className="group-stamp">★ AREA COMPLETE</span>
              )}
              <span className="group-drive">~{fmtDrive(g.min)} from {start.label}</span>
            </div>
            {g.trails.map((t) => {
              const p = log[t.id] || {};
              const v = verdict(wxFor(t));
              return (
                <div key={t.id} className={"row" + (sel === t.id ? " row-sel" : "")} onClick={() => setSel(t.id)}>
                  <div className="row-check" onClick={(e) => { e.stopPropagation(); updateLog(t.id, { done: !p.done }); }}>
                    <span className={"box" + (p.done ? " box-on" : "")}>{p.done ? "✓" : ""}</span>
                  </div>
                  <div className="row-main">
                    <div className="row-name">{t.name}</div>
                    <div className="row-meta">
                      {t.mi} mi · {t.gain.toLocaleString()}′ gain · {t.vehicle}
                    </div>
                  </div>
                  <div className="row-right">
                    <DiffTag d={t.diff} />
                    <VerdictChip v={v} small />
                    {p.rating ? <Stars n={p.rating} size={12} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty">No trails match those filters. Loosen one and the map fills back in.</div>
        )}
      </div>

      {trail && (
        <div className="drawer-scrim" onClick={() => setSel(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <Detail
              t={trail}
              area={AREAS[trail.area]}
              start={start}
              w={wxFor(trail)}
              p={log[trail.id] || {}}
              gpsApp={gpsApp}
              onChooseGps={chooseGps}
              onPatch={(patch) => updateLog(trail.id, patch)}
              onClose={() => setSel(null)}
            />
          </div>
        </div>
      )}

      <footer className="ft">
        Curated field set of {TRAILS.length} classics — not every trail in the state. Drive times are straight-line
        estimates from your chosen starting point, not routed directions. Roads, permits and closures change:
        verify with CDOT, the land manager, and a real forecast before you drive. Your log saves to this Claude account.
      </footer>
    </div>
  );
}

/* ---------- DETAIL PANEL ---------- */
function Detail({ t, area, start, w, p, gpsApp, onChooseGps, onPatch, onClose }) {
  const v = verdict(w);
  const dirHref = directionsUrl(gpsApp, t.lat, t.lon, t.name + " TH");
  return (
    <div className="det">
      <button className="det-close" onClick={onClose}>✕ CLOSE</button>

      <div className="det-eyebrow">{area.label.toUpperCase()} · ~{fmtDrive(driveMin(start, area)).toUpperCase()} FROM {start.label.toUpperCase()}</div>
      <h2 className="det-name">{t.name}</h2>
      <div className="det-th">Trailhead: {t.th}</div>

      <div className="dir-row">
        <a className="dir-btn" href={dirHref} target="_blank" rel="noreferrer">
          ▸ Directions to trailhead
        </a>
        <label className="dir-app">
          <span>via</span>
          <select value={gpsApp} onChange={(e) => onChooseGps(e.target.value)}>
            {GPS_APPS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
      </div>

      <div className={"det-wx" + (v ? " det-wx-" + v.toLowerCase() : "")}>
        {w ? (
          <>
            <div className="det-wx-verdict"><VerdictChip v={v} /></div>
            <div className="det-wx-line">
              {w.summary} · high {w.hi}° / low {w.lo}° · wind to {w.wind} mph · {w.precip}% precip
            </div>
          </>
        ) : (
          <div className="det-wx-line">No forecast loaded — hit “Get today's conditions” up top.</div>
        )}
      </div>

      <div className="spec">
        <div><span>Distance</span><b>{t.mi} mi · {t.type}</b></div>
        <div><span>Difficulty</span><b><DiffTag d={t.diff} /></b></div>
        <div><span>Elevation gain</span><b>{t.gain.toLocaleString()} ft — {t.gainR}</b></div>
        <div><span>Views</span><b><Stars n={t.views} size={14} /></b></div>
        <div className="spec-wide"><span>Vehicle</span><b>{t.vehicle}</b></div>
        <div className="spec-wide"><span>Road notes</span><b>{t.vroad}</b></div>
        <div className="spec-wide"><span>Arrive</span><b>{t.arrive}</b></div>
        <div className="spec-wide"><span>Sun today</span><b>{(() => { const su = sunTimes(t.lat, t.lon); return su ? `Rises ${su.rise} · sets ${su.set} (trailhead local)` : "—"; })()}</b></div>
        <div className="spec-wide"><span>Prime season</span><b>{t.prime}</b></div>
        <div className="spec-wide spec-avoid"><span>Avoid</span><b>{t.avoid}</b></div>
      </div>

      <div className="apres">
        <div className="apres-col">
          <div className="apres-hd">NEAREST PINTS</div>
          {area.brew.map((b) => (
            <div key={b.n} className="apres-item"><b>{b.n}</b><span>{b.d}</span></div>
          ))}
        </div>
        <div className="apres-col">
          <div className="apres-hd">NEAREST PLATES</div>
          {area.eat.map((b) => (
            <div key={b.n} className="apres-item"><b>{b.n}</b><span>{b.d}</span></div>
          ))}
        </div>
      </div>

      <div className="fieldlog">
        <div className="fieldlog-hd">FIELD LOG</div>
        <div className="fieldlog-row">
          <label className="done-toggle" onClick={() => onPatch({ done: !p.done })}>
            <span className={"box big" + (p.done ? " box-on" : "")}>{p.done ? "✓" : ""}</span>
            {p.done ? "Logged — nice work" : "Mark as completed"}
          </label>
          <div className="myrating">
            <span>MY RATING</span>
            <Stars n={p.rating || 0} onSet={(n) => onPatch({ rating: n })} size={44} />
          </div>
        </div>
        <textarea
          className="notes"
          placeholder="Trip notes — conditions, parking beta, who you dragged along, where the beer was…"
          value={p.notes || ""}
          onChange={(e) => onPatch({ notes: e.target.value })}
          rows={4}
        />
        <div className="fieldlog-save">Saves automatically to your log.</div>
        {p.done && <div className="stamp">LOGGED</div>}
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,400..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --paper: #F7F3E7;
  --paper-2: #EFE9D6;
  --ink: #241E12;
  --ink-soft: #4A4232;
  --contour: #A8834C;
  --pine: #1F3D2B;
  --pine-2: #38684B;
  --quadred: #AE3A24;
  --water: #54809B;
  --good: #38684B;
  --fair: #B47F24;
  --poor: #AE3A24;
}
* { box-sizing: border-box; }
.atlas {
  background: var(--paper);
  color: var(--ink);
  font-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  min-height: 100vh;
  padding: 0 0 44px;
  font-size: 13px;
}
.atlas h1, .atlas h2, .det-name, .hd-num, .stamp { font-family: 'Archivo', 'Arial Narrow', sans-serif; }

/* header */
.hd { padding: calc(24px + env(safe-area-inset-top)) 20px 0; }
.hd-rule { border-top: 3px double var(--ink); }
.hd-main { display: flex; justify-content: space-between; gap: 18px; padding: 18px 2px 16px; flex-wrap: wrap; }
.hd-eyebrow { font-size: 10px; letter-spacing: 0.2em; color: var(--contour); margin-bottom: 10px; font-weight: 500; }
.hd h1 {
  margin: 0; font-size: clamp(36px, 6.4vw, 62px); line-height: 0.92;
  font-weight: 900; font-stretch: 78%; letter-spacing: 0.005em; color: var(--pine);
}
.hd-sub { margin-top: 10px; font-size: 12.5px; color: var(--ink-soft); }
.hd-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 9px; }
.hd-num { font-size: 44px; font-weight: 900; color: var(--quadred); line-height: 1; }
.hd-num span { font-size: 19px; color: var(--ink-soft); font-weight: 700; }
.hd-lbl { font-size: 10px; letter-spacing: 0.22em; margin-top: 2px; color: var(--ink-soft); }
.wx-btn {
  font-family: inherit; font-size: 11.5px; letter-spacing: 0.13em; font-weight: 600;
  background: var(--pine); color: var(--paper); border: none; padding: 11px 18px;
  cursor: pointer; transition: background 0.15s;
}
.wx-btn:hover { background: var(--pine-2); }
.wx-btn:disabled { opacity: 0.6; cursor: wait; }
.wx-ts { font-size: 10px; color: var(--ink-soft); }
.wx-err { font-size: 11px; color: var(--poor); max-width: 230px; }

/* control console: starting point row + filter row share one frame */
.startbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin: 0 20px; padding: 10px 13px;
  border: 1.5px solid var(--ink); border-bottom: 1.5px dashed var(--ink);
  background: var(--paper-2); font-size: 11.5px;
}
.startbar select {
  font-family: inherit; font-size: 11.5px; background: var(--paper);
  border: 1.5px solid var(--ink); padding: 7px 9px; color: var(--ink); border-radius: 0;
  font-weight: 600;
}
.start-note { color: var(--ink-soft); font-size: 10.5px; }

/* legend / filters */
.legend {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  margin: 0 20px; padding: 11px 13px;
  border: 1.5px solid var(--ink); border-top: none; background: var(--paper-2);
  font-size: 11.5px;
}
.legend-lbl { letter-spacing: 0.16em; font-weight: 600; }
.legend select {
  font-family: inherit; font-size: 11.5px; background: var(--paper);
  border: 1.5px solid var(--ink); padding: 7px 9px; color: var(--ink); border-radius: 0;
}
.legend-count { margin-left: auto; color: var(--ink-soft); }

.list-key {
  margin: 18px 20px 0; padding: 11px 14px;
  border: 1.5px solid var(--contour); background: var(--paper-2);
  font-size: 11.5px; line-height: 1.55; color: var(--ink-soft);
}
.list-key b { color: var(--ink); font-weight: 600; }

/* quad sheet */
.quad-wrap { margin: 16px 20px 6px; }
.quad-frame { position: relative; }
.quad {
  width: 100%; height: auto; display: block; user-select: none; -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent; cursor: grab;
}
.quad:active { cursor: grabbing; }
.quad-paper { fill: var(--paper-2); }
.quad-border { fill: none; stroke: var(--ink); stroke-width: 2.5; }
.grat { stroke: var(--contour); stroke-width: 0.5; opacity: 0.35; stroke-dasharray: 2 4; }
.contour { fill: none; stroke: var(--contour); stroke-width: 0.8; opacity: 0.4; }
.divide { fill: none; stroke: var(--water); stroke-width: 1.4; stroke-dasharray: 7 4; opacity: 0.8; }
.range-lbl { font-size: 9px; letter-spacing: 0.32em; fill: var(--contour); opacity: 0.75; font-family: inherit; }
.city { fill: var(--ink); opacity: 0.6; }
.city-lbl { font-size: 9px; letter-spacing: 0.12em; fill: var(--ink); opacity: 0.7; font-weight: 600; }
.quad-note { font-size: 8.5px; letter-spacing: 0.14em; fill: var(--ink); opacity: 0.55; }

.mark-halo { fill: transparent; }
.mark-tri { fill: var(--paper); stroke: var(--pine); stroke-width: 2.2; }
.mark-good .mark-tri { fill: var(--good); stroke: var(--pine); }
.mark-fair .mark-tri { fill: var(--fair); stroke: #7d5716; }
.mark-poor .mark-tri { fill: var(--poor); stroke: #6f2314; }
.mark-done .mark-tri { fill: var(--quadred); stroke: var(--ink); }
.mark-check { font-size: 9px; fill: var(--paper); text-anchor: middle; font-weight: 700; pointer-events: none; }
.mark-lbl {
  font-size: 10px; fill: var(--ink); font-weight: 600; font-family: inherit;
  paint-order: stroke; stroke: var(--paper-2); stroke-width: 3px; stroke-linejoin: round;
  pointer-events: none;
}
.mark-sel .mark-halo { fill: none; stroke: var(--quadred); stroke-width: 2; stroke-dasharray: 3 3; }
.mark:hover .mark-tri { filter: brightness(1.12); }

.ring { fill: none; stroke: var(--water); stroke-width: 0.9; stroke-dasharray: 5 4; opacity: 0.55; }
.ring-lbl { font-size: 8px; letter-spacing: 0.2em; fill: var(--water); opacity: 0.8; text-anchor: middle; font-family: inherit; font-weight: 600; }
.start-star { fill: var(--quadred); stroke: var(--paper); stroke-width: 1.4; }
.start-lbl {
  font-size: 9px; letter-spacing: 0.12em; fill: var(--quadred); font-weight: 700; font-family: inherit;
  paint-order: stroke; stroke: var(--paper-2); stroke-width: 3px; stroke-linejoin: round;
  pointer-events: none;
}

.quad-jumps { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; margin-top: 9px; }
.season-toggle {
  display: inline-flex; align-items: center; gap: 7px; margin-left: auto;
  font-size: 10px; letter-spacing: 0.1em; font-weight: 600; cursor: pointer; user-select: none;
}
.season-box { width: 16px; height: 16px; font-size: 11px; }
.quad-jumps-lbl { font-size: 10px; letter-spacing: 0.16em; font-weight: 600; color: var(--ink-soft); }
.jump-chip {
  font-family: inherit; font-size: 10px; letter-spacing: 0.1em; font-weight: 600;
  background: var(--paper); color: var(--pine); border: 1.5px solid var(--pine);
  padding: 5px 10px; cursor: pointer;
}
.jump-chip:hover { background: var(--pine); color: var(--paper); }
.jump-chip-active { background: var(--pine); color: var(--paper); }
.jump-chip:focus-visible { outline: 2.5px solid var(--quadred); outline-offset: 1px; }

.zoom-ui { position: absolute; right: 12px; top: 12px; display: flex; flex-direction: column; gap: 6px; }
.zbtn {
  width: 38px; height: 38px; font-size: 19px; line-height: 1;
  font-family: inherit; font-weight: 600;
  background: var(--paper); color: var(--ink); border: 2px solid var(--ink);
  cursor: pointer;
}
.zbtn:hover { background: var(--paper-2); }
.zbtn-reset { font-size: 15px; }

.quad-key { display: flex; gap: 16px; align-items: center; font-size: 10px; letter-spacing: 0.1em; margin-top: 7px; color: var(--ink-soft); flex-wrap: wrap; }
.quad-key .k { display: inline-block; width: 11px; height: 11px; margin-right: 5px; vertical-align: -1.5px; border: 1.5px solid var(--ink); }
.k-star { color: var(--quadred); font-size: 13px; margin-right: 4px; vertical-align: -1px; }
.k-good { background: var(--good); } .k-fair { background: var(--fair); }
.k-poor { background: var(--poor); } .k-done { background: var(--quadred); }
.quad-zoom-note { margin-left: auto; }

/* list */
.list { margin: 16px 20px 0; }
.group-hd {
  display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
  margin-top: 18px; padding: 7px 6px;
  background: var(--pine); color: var(--paper);
}
.group-name { font-size: 11px; letter-spacing: 0.2em; font-weight: 600; }
.group-drive { font-size: 10px; letter-spacing: 0.08em; opacity: 0.85; margin-left: auto; }
.group-stamp {
  font-size: 9px; letter-spacing: 0.14em; font-weight: 700; color: var(--paper);
  border: 1.5px solid var(--paper); padding: 2px 7px; transform: rotate(-2deg); opacity: 0.92;
  white-space: nowrap;
}
.row {
  display: flex; align-items: center; gap: 13px;
  padding: 13px 6px; border-bottom: 1px solid rgba(36,30,18,0.22);
  cursor: pointer; transition: background 0.1s;
}
.row:hover, .row-sel { background: var(--paper-2); }
.box {
  display: inline-flex; width: 20px; height: 20px; border: 2px solid var(--pine);
  align-items: center; justify-content: center; font-size: 13px; color: var(--paper);
  background: var(--paper); flex-shrink: 0; user-select: none;
}
.box.big { width: 26px; height: 26px; font-size: 16px; }
.box-on { background: var(--quadred); border-color: var(--quadred); }
.row-main { flex: 1; min-width: 0; }
.row-name { font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 15.5px; font-stretch: 88%; }
.row-meta { font-size: 11px; color: var(--ink-soft); margin-top: 3px; }
.row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; max-width: 40%; }
.empty { padding: 26px 6px; font-size: 12.5px; color: var(--ink-soft); }

.diff { font-size: 10px; letter-spacing: 0.07em; padding: 3px 8px; border: 1.5px solid; font-weight: 600; white-space: nowrap; }
.diff-easy { color: var(--good); border-color: var(--good); }
.diff-mod { color: #8a5f14; border-color: var(--fair); }
.diff-hard { color: var(--quadred); border-color: var(--quadred); }
.diff-vhard { color: var(--paper); background: var(--quadred); border-color: var(--quadred); }

.chip { font-size: 10px; letter-spacing: 0.07em; padding: 3px 9px; font-weight: 600; border: 1.5px solid var(--ink); white-space: nowrap; }
.chip-good { background: var(--good); color: var(--paper); border-color: var(--good); }
.chip-fair { background: var(--fair); color: var(--paper); border-color: var(--fair); }
.chip-poor { background: var(--poor); color: var(--paper); border-color: var(--poor); }
.chip-na { opacity: 0.4; }

.stars { color: var(--contour); letter-spacing: 1.5px; }
.star { opacity: 0.28; }
.star.on { opacity: 1; color: var(--quadred); }
.star.tap { cursor: pointer; padding: 0 1px; }

/* drawer */
.drawer-scrim {
  position: fixed; inset: 0; background: rgba(36,30,18,0.55);
  display: flex; justify-content: flex-end; z-index: 50;
}
.drawer {
  width: min(580px, 100%); height: 100%; overflow-y: auto;
  overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  background: var(--paper); border-left: 3px double var(--ink);
  animation: slide 0.22s ease-out;
}
@keyframes slide { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .drawer { animation: none; } }

.det { padding: calc(22px + env(safe-area-inset-top)) 24px 44px; position: relative; }
.det-close {
  font-family: inherit; font-size: 12px; letter-spacing: 0.14em;
  background: var(--paper); border: 1.5px solid var(--ink); padding: 10px 14px;
  cursor: pointer; float: right; color: var(--ink);
  position: sticky; top: calc(8px + env(safe-area-inset-top)); z-index: 2;
}
.det-eyebrow { font-size: 10px; letter-spacing: 0.2em; color: var(--contour); font-weight: 500; }
.det-name {
  font-size: clamp(28px, 5vw, 40px); font-weight: 900; font-stretch: 80%;
  line-height: 0.95; color: var(--pine); margin: 8px 0 8px;
}
.det-th { font-size: 12px; color: var(--ink-soft); margin-bottom: 12px; }

.dir-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 17px; }
.dir-btn {
  font-family: inherit; font-size: 12px; letter-spacing: 0.1em; font-weight: 600;
  text-decoration: none; background: var(--pine); color: var(--paper);
  border: 2px solid var(--pine); padding: 9px 15px; cursor: pointer; white-space: nowrap;
}
.dir-btn:hover { background: var(--paper); color: var(--pine); }
.dir-app { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; letter-spacing: 0.14em; color: var(--ink-soft); font-weight: 600; }
.dir-app select {
  font-family: inherit; font-size: 11px; letter-spacing: 0.04em; font-weight: 600;
  background: var(--paper); color: var(--ink); border: 1.5px solid var(--ink);
  padding: 6px 8px; cursor: pointer; border-radius: 0;
}
.dir-app select:focus-visible { outline: 2.5px solid var(--quadred); outline-offset: 1px; }

.det-wx { border: 2px solid var(--ink); padding: 13px 15px; margin-bottom: 17px; background: var(--paper-2); }
.det-wx-good { border-color: var(--good); }
.det-wx-fair { border-color: var(--fair); }
.det-wx-poor { border-color: var(--poor); }
.det-wx-verdict { margin-bottom: 7px; }
.det-wx-line { font-size: 12.5px; line-height: 1.55; }

.spec { display: grid; grid-template-columns: 1fr 1fr; border-top: 2px solid var(--ink); }
.spec > div {
  border-bottom: 1px solid rgba(36,30,18,0.22); padding: 10px 2px;
  display: flex; flex-direction: column; gap: 4px;
}
.spec-wide { grid-column: 1 / -1; }
.spec span { font-size: 9.5px; letter-spacing: 0.2em; color: var(--contour); font-weight: 500; }
.spec b { font-size: 13px; font-weight: 600; line-height: 1.5; }
.spec-avoid b { color: var(--quadred); }

.apres { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
.apres-hd { font-size: 10.5px; letter-spacing: 0.2em; border-bottom: 2.5px solid var(--quadred); padding-bottom: 6px; margin-bottom: 11px; font-weight: 600; }
.apres-item { margin-bottom: 11px; }
.apres-item b { display: block; font-size: 13px; }
.apres-item span { font-size: 11px; color: var(--ink-soft); line-height: 1.45; }

.fieldlog { margin-top: 24px; border: 2.5px solid var(--pine); padding: 15px; position: relative; background: var(--paper-2); }
.fieldlog-hd { font-size: 10.5px; letter-spacing: 0.26em; font-weight: 600; color: var(--pine); margin-bottom: 13px; }
.fieldlog-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 13px; }
.done-toggle { display: flex; align-items: center; gap: 11px; font-size: 12.5px; cursor: pointer; user-select: none; }
.myrating { display: flex; align-items: center; gap: 14px; }
.myrating span { font-size: 12px; letter-spacing: 0.18em; color: var(--ink-soft); }
.myrating .stars { letter-spacing: 7px; line-height: 1; }
.myrating .star.tap { padding: 4px 3px; }
.notes {
  width: 100%; font-family: inherit; font-size: 12.5px; line-height: 1.6;
  background: var(--paper); border: 1.5px solid var(--ink); padding: 11px; color: var(--ink);
  resize: vertical; border-radius: 0;
}
.notes:focus, .legend select:focus, .startbar select:focus, .wx-btn:focus-visible, .det-close:focus-visible, .zbtn:focus-visible {
  outline: 2.5px solid var(--quadred); outline-offset: 1px;
}
.fieldlog-save { font-size: 10px; color: var(--ink-soft); margin-top: 7px; }
.stamp {
  position: absolute; top: 10px; right: 12px;
  font-weight: 900; font-size: 21px; letter-spacing: 0.1em;
  color: var(--quadred); border: 3.5px solid var(--quadred); padding: 2px 11px;
  transform: rotate(-9deg); opacity: 0.88;
}

.ft { margin: 28px 20px 0; padding-top: 13px; border-top: 3px double var(--ink); font-size: 10.5px; line-height: 1.75; color: var(--ink-soft); }

@media (max-width: 640px) {
  .hd-main { flex-direction: column; }
  .jump-chip { padding: 5px 8px; letter-spacing: 0.06em; }
  .startbar select, .legend select { flex: 1; min-width: 40%; }
  .hd-right { align-items: flex-start; text-align: left; }
  .apres { grid-template-columns: 1fr; }
  .row-right .stars { display: none; }
  .row-right { max-width: 46%; }
  .zbtn { width: 42px; height: 42px; }
}
`;
