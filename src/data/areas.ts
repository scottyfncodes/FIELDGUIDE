import type { Area } from "./types";

/* ---------- AREAS ----------
   Towns the trails are grouped under. The label + coordinates drive the
   drive-time estimates; brew/eat are hand-picked après spots (these go stale —
   the detail sheet tells people to check before they go). */
export const AREAS: Record<string, Area> = {
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
