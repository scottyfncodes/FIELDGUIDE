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
| **OpenStreetMap** via Overpass | North America (capped at 15 mi radius) | named footpaths, SAC scale, surface, dog rules | Overpass refuses datacenter clients (406), so it was written to its documented JSON format and couldn't be checked from the build box. If it fails, the other sources still show and the footer says it didn't answer |
| **Atlas classics** | the original 47 | field-checked notes | in-app |

How a search works (`lib/discover.ts`):

1. **Count, then page.** Each ArcGIS layer is counted first. If the radius holds more
   than 3,000 segments, the box halves (nearest first) and the footer says so. Records
   are then paged with `resultOffset`.
2. **Segments to trails.** A source's segments are grouped by normalized name and
   manager, then split into pieces that actually connect. Two "Mesa Trail"s miles apart
   stay two trails.
3. **Dedupe across sources.** Same normalized name and geometry within a quarter mile is
   one trail. COTREX leads, then USFS, then OSM. Gaps are filled from the others and
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
- **Difficulty** is the Forest Service trail class or the OSM SAC scale, worded as what
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
   isn't kept either.

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
- **Guard rails in code:** off without a key (the UI says so honestly), same-origin
  only, image size cap, input validation before any spend, and refusals surface as
  "declined", never as a fake answer.
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
