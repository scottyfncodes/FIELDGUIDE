# Location-first discovery and Nature ID

What changed in the 2026-10 upgrade, which outside services the app now talks to, what
each costs, and what is still blocked.

## 1. Audit (before)

- Trails: 47 hand-curated Colorado trails in `src/data/trails.ts`. Distances and the
  map's drive rings came from a **starting point** picked from 9 preset towns
  (`START_PRESETS`, defaulting to Sloan's Lake) or a one-shot GPS read.
- No geocoding, no live trail data, no server code. A static Vite PWA on Vercel.
- Identify: a deterministic **field key** for 46 plants. The photo was kept, never analysed.
- iNaturalist (keyless) for plant photos, monthly records and plants recorded near a place.

## 2. Location-first discovery

The preset towns are gone (`START_PRESETS` and the "Starting point" chip were deleted).
Explore opens on **Find trails near…**:

- **Use my location** asks the phone only when tapped, says why first, and maps every
  failure (denied, unavailable, timeout, unsupported, insecure page, Safari never
  answering) to a plain message that moves focus to the address field. Nothing ever
  falls back to a town the app picked. A fix rougher than 3 km is flagged.
- **Address or place** takes streets, towns, ZIPs, parks, trailheads and peaks.
  An ambiguous name shows a short "Which one?" list.
- **Radius** presets: 5, 10, 25, 50 mi.
- The last search point is kept in the original `co-trail-start-v1` key, same shape.
  A user with an old preset stored there gets it back as their last search.

### Geocoding

| Service | Role | Cost | Terms we follow |
| --- | --- | --- | --- |
| Nominatim (OSM Foundation) | primary | free | search on submit only (no type-ahead), max 1 request a second (enforced in `lib/geocode.ts`), answers cached on the device for 30 days, OSM credited under the field |
| Photon (komoot) | fallback when Nominatim refuses (403/429) or is down | free | same data, same attribution |

Both were checked live: CORS-open JSON. Results are limited to the US, Canada and Mexico.
No keys and no secrets. Limits: the public Nominatim is for modest traffic. If FieldGuide
grows to thousands of searches a day, the cheapest fix is a cached proxy, or a paid OSM
geocoder (LocationIQ, or MapTiler from about $25/month).

## 3. Trail coverage: live sources

Trails are queried live by bounding box around the search point (`lib/trailSources.ts`).
Nothing is bundled, so coverage doesn't cost download size.

| Source | Coverage | What it gives | Verified |
| --- | --- | --- | --- |
| **COTREX**, Colorado Trail Explorer (CPW), state GIS server layer 40 + trailheads layer 29 | all of Colorado, about 40,000 mi from 230+ managers | name, manager, surface, hike/bike/horse/dogs, access, min/max elevation, length, edit date; trailheads with fee/water/restrooms | live: CORS allowed, 2,000 records a page, edits through 2023 |
| **USFS** National Forest System trails (EDW) | every national forest in the US: the Rockies and far beyond | Forest Service trail class 1–5, typical grade, surface, accessibility, the season it's managed for hikers, trail number | live: CORS allowed, works in Wyoming as well as Colorado |
| **National Park Service** public trails (NPS national dataset, FeatureServer 0) | every national park unit | trail class 1–5 where rated ("Unknown" stays unrated), surface, managed use, access notes, park name, edit date | live: CORS allowed, paged |
| **BLM** routes (National GTLF public display, layer 7) | BLM land in every western state | route name, surface, managed modes of travel, access restriction, mapped miles | live: CORS allowed, paged |
| **OpenStreetMap** via Overpass | North America (capped at 15 mi radius) | named footpaths, SAC scale, surface, dog rules | Overpass refuses datacenter clients (406), so it was written to its documented JSON format and couldn't be checked from the build box. If it fails, the other sources still show and the footer says it didn't answer |
| **Atlas classics** | the original 47 | field-checked notes | in-app |

**Checked live on 2026-10-28** by running the app's own `discover()` from a Vercel
Sandbox (a datacenter, not a phone):

| Search | COTREX | USFS | OSM | Trails |
| --- | --- | --- | --- | --- |
| Boulder, CO, 10 mi | 1,296 segments | 32 | failed (406) | 400 |
| Jackson, WY, 10 mi | skipped | 115 | failed | 93 |
| Moab, UT, 10 mi (before NPS and BLM) | skipped | 0 | failed | **0** |
| Moab, UT, 10 mi (with NPS and BLM) | skipped | 0 | failed | **10** |
| Zion, UT, 10 mi (NPS) | skipped | | failed | 28 |
| Banff, AB, 10 mi | skipped | skipped | failed | **0** |
| Denver, 50 mi | 9,084 in range: capped (see below) | 961 | failed | 626 |

Both ArcGIS layers support `resultOffset` paging (3 pages, no duplicates). National parks and BLM land
were added after a real Moab search came back empty. Outside Colorado and federal land
(city parks, state parks elsewhere, Canada), coverage depends on OpenStreetMap, which
refuses datacenter clients, so it is **unverified until checked from a phone**. When OSM fails and nothing else is found,
the app says a source didn't answer rather than "no trails here".

How a search works (`lib/discover.ts`):

1. **Count, then page.** Each ArcGIS layer is counted first. If the radius holds more
   than 6,000 segments (a 50 mi Front Range search holds about 9,100), the box shrinks
   in proportion to the overflow, nearest first, and the footer says how far it reached.
   Records are then paged with `resultOffset`.
   Each source has a deadline (45 s ArcGIS, 35 s Overpass). The ArcGIS sources show
   as soon as they arrive; OpenStreetMap merges in when it answers.
   **Privacy:** the services get the search point rounded to 0.01° (about 1 km), with
   the box widened by a mile. Exact distances are computed on the phone. The town-name
   lookup and iNaturalist "seen nearby" queries are rounded the same way.
2. **Segments to trails.** A source's segments are grouped by normalized name (not
   manager: Twin Sisters crosses from a national forest into a national park), then split into pieces that actually connect. Two "Mesa Trail"s miles apart
   stay two trails.
3. **Dedupe across sources.** Same normalized name and geometry within a quarter mile is
   one trail. COTREX leads, then NPS, USFS, BLM, then OSM. Gaps are filled from the others and
   every source id is kept.
4. A COTREX trailhead within 0.15 mi of the line is attached. A found trail that matches
   a curated classic links to it.
5. Results are ranked by **straight-line** distance to the nearest mapped point and
   shown 20 at a time.

What's shown and how it's labelled:

- **Mapped length** is the sum of every mapped section (not a loop or round trip).
- **Elevation** is COTREX's low and high point.
- **Climb** is *computed* from Open-Meteo's free elevation API (Copernicus 90 m DEM)
  along the longest mapped section.
- **Time** is a book-time *estimate*.
- **Difficulty** is the Forest Service or Park Service trail class (one interagency 1–5 scale) or the OSM SAC scale, worded as what
  it is. Otherwise "not rated by these sources".
- Distances are straight lines. Directions open Google Maps for real driving. With no
  mapped trailhead, the sheet warns that the point may lack road access.
- No live conditions or closures are claimed anywhere.

A searched trail can be **saved**, or have finds and outings logged at it. A compact
snapshot (simplified geometry plus attributes) is kept in the atlas store under
`found`, and stays as long as something points at it.

## 4. Nature ID: wildlife

These are three separate capabilities, kept separate on screen.

| Capability | Provider | Status |
| --- | --- | --- |
| Species information | iNaturalist API (keyless): taxon, photo with credit, Wikipedia summary, conservation statuses, research-grade sightings by month and near a point | **working** |
| Photo recognition | `api/identify.ts` Vercel Function calling Claude's vision model (Anthropic API, structured JSON output) | **built and tested, switched off until a key is added** (see blockers) |
| Bird sound ID | none | **not built** (see follow-on) |

iNaturalist's own computer-vision endpoint answered **401 Unauthorized**: it needs an
approved partner token, so it isn't an option today.

### The flow

1. Pick **Plant** (the existing field key, unchanged), **Bird**, **Insect or spider**, or
   **Mammal or other animal**.
2. Take or choose a photo.
3. **With recognition on**, the server suggests up to 4 species from the picture alone,
   then the app:
   - resolves each suggestion to an iNaturalist taxon by **exact scientific name**, then
     uses the taxon id (a name that doesn't resolve can't be saved under that name);
   - **caps** any "likely" at "possible" when the photo is blurry, distant, dark,
     obscured or partial;
   - shows photo problems and tips for a better photo, plus the marks the model says it
     saw and what to check next;
   - reorders candidates **only within the same likelihood tier**, using research-grade
     sightings within 10 km this season. Being common nearby never lifts a long shot.
   - The model never receives the location. The photo is re-encoded first, so EXIF/GPS
     tags never leave the phone.
4. **Compare with species seen nearby** works with or without recognition: a grid of
   species with research-grade sightings near the outing, the trail, the Explore search
   point or a GPS fix. Tapping one sets your photo beside the reference photo (credited).
   Name search covers anything else.
5. **Save** to the journal: place (including saved search trails), note, and location as
   *none*, *approximate (~1 km)* or *exact*. Species iNaturalist marks as threatened or
   at risk never keep coordinates. When sensitivity can't be checked (offline), location
   isn't kept either. "Sensitive" counts only statuses that apply here (worldwide, the
   US or Colorado) plus iNaturalist's own location-hiding. iNaturalist lists every
   state's and province's rank, and checked live, Mountain Bluebird (S2B in Yukon) and
   black bear (S1 in North Dakota) would otherwise read as at risk, while Canada lynx is
   correctly flagged (S1 in Colorado). The full taxon record is always fetched before
   saving, because search results carry no statuses.

Trail pages now list **wildlife recorded nearby** (birds / insects & spiders / mammals &
more). These are observed sightings, and the copy says it isn't a list of everything
that lives there. iNaturalist already blurs sensitive species' locations.

### Photo recognition: cost and setup

- **Model:** `claude-opus-5-5` (override with `IDENTIFY_MODEL`). Effort `medium`, server
  fallback on refusal, one image per request, no storage.
- **Cost:** about 2–3k input tokens (image plus prompt) and 1–2k output. At $4/$20 per
  million tokens that's roughly **$0.02–0.05 per identification**, paid per use, with no
  subscription. `IDENTIFY_MODEL=claude-haiku-5-5` would cut that by about 40×, at some
  loss of accuracy.
- **Guard rails in code:** off without a key (the UI says so honestly). Requests must
  carry this deployment's own Origin (no wildcard). JSON only. Body size is checked
  before it's read. The whole image is validated: base64, plus a signature matching its
  declared type. Errors never echo upstream details. Refusals surface as "declined",
  never as a fake answer. The service worker never caches `/api/`, so turning the key
  on reaches installed copies of the app.
- **What the code can't do:** the Origin check stops other websites spending through
  visitors' browsers, not a script that forges headers. The rate limit and spend cap
  below are required, not optional.
- **Before switching on:** add a Vercel Firewall rate-limit rule on `/api/identify`
  (for example 20 requests per IP per hour) and an Anthropic workspace spend limit.

## 5. Blockers and the cheapest next step

1. **Photo recognition needs an API key.** Add `ANTHROPIC_API_KEY` (and optionally
   `IDENTIFY_MODEL`) as a Vercel environment variable for Preview and Production, then
   redeploy. That's the only step. Until then the app says "isn't switched on" and the
   compare flow does the work.
2. **Overpass couldn't be verified from the build environment.** Check on the preview
   that searches outside Colorado show OpenStreetMap trails. If the public instance
   proves unreliable, the cheapest alternative is a different public instance, or caching
   behind a small proxy.
3. **Bird sound ID** is a follow-on. BirdNET's model can run in the browser, but its
   licence is CC BY-NC-SA (non-commercial), so it needs a licensing decision first.
   Merlin has no public API.
4. **Real iPhone Safari** wasn't available here. Playwright emulates iPhone 13 and
   iPhone SE viewports, touch and scale in Chromium. Check the preview on a phone.
