# Consolidating Lookup, Leaf Hunter and CO Trail Atlas

The record of how the three HaveAnApp outdoor apps became one product, CO Field
Atlas: what was audited, what was decided and why, what moved where, how user
data is handled, and how production cutover and rollback would work.

## 1. Audit: what actually existed

| | CO Trail Atlas | Leaf Hunter | LOOKUP |
| --- | --- | --- | --- |
| Repo | `scottyfncodes/CO-Trails-Atlas` | `scottyfncodes/Leaf-Hunter` | `scottyfncodes/LOOKUP` |
| Production | Vercel project `co-trails-atlas` (team HaveAnApp), `main` → co-trails-atlas.vercel.app | GitHub Pages from `main` → scottyfncodes.github.io/Leaf-Hunter/ | GitHub Pages from `main` → scottyfncodes.github.io/LOOKUP/ |
| Stack | Vite 5, React 18, TS, Vitest, Playwright | Vite 5, React 18, React Router 6, TS, Vitest, vite-plugin-pwa | Vite 7, React 19, TS, Vitest |
| What it is | 47 curated Colorado trails on an SVG quad-sheet map, drive rings, Open-Meteo trailhead forecast, hiking log | **Fall-foliage finder**: 40 aspen/color spots, a peak-timing model, color wave, hunt/chase planners, "leaf check" photo reports, watchlist | **Stargazing call engine**: 21 dark-sky sites, offline astronomy (Meeus), cloud forecast, OSRM drive times, SWPC aurora |
| Backend / DB / auth | none | none | none |
| User data | `localStorage`: `co-trail-log-v1` (hiked, rating, notes), start point, forecast cache | `localStorage`: `leafhunter:reports`, `leafhunter:favorites`, `leafhunter:homeBase` | `localStorage`: `lookup:prefs:v1` (home, limits, custom sites); JSON export/import |
| External services | Open-Meteo (no key) | none (demo reports generated locally) | Open-Meteo, OSRM demo server, NOAA SWPC, Open-Meteo geocoding (no keys) |
| Env vars / secrets | none | none | none |
| Tests | 106 unit + Playwright on iPhone 13, iPhone SE, desktop | Vitest domain + screen tests | Vitest astronomy, engine, services |

**The brief's assumptions vs the code.** The brief described Leaf Hunter as a plant
and leaf *identification* app and LOOKUP as a *field guide*. Neither is. No app had
image recognition, species data, accounts or a server. Decisions below follow the
real code.

## 2. Architecture chosen

**One static Vite + React app, built on the CO Trail Atlas codebase, deployed by its
existing Vercel project.** Why:

- It's the only one already on Vercel, it has the strongest test suite (including
  real-device-sized Playwright runs), and its map and discovery are the core of Explore.
- All three apps are local-first SPAs with no server, so a merger needs no backend.
  Adding one (accounts, sync) would add cost and a privacy surface the originals
  deliberately avoided. Deferred, not ruled out.
- Ported code from the other two is pure TypeScript and was copied verbatim with its
  tests (`src/lib/astro/*` from LOOKUP, `src/lib/foliage/*` from Leaf Hunter).

### Navigation

Four tabs: **Explore** (trails, fall color, dark skies on one map), **Identify**
(camera-first key), **My Atlas** (the collection), **Quests**. The **Field Guide** is a
sheet reachable from Explore search, identification results, species cards, the atlas,
quests and place pages. It has no tab. Every screen and sheet is in the URL hash; the
original `#trail=<id>` share links still work unchanged.

### Where each original went

| Original capability | Now |
| --- | --- |
| Trail Atlas map, filters, sort, regions, forecast, trail sheet, hiking log, share links, PWA/offline | Explore, unchanged behavior (all original tests still pass) |
| Leaf Hunter 40 color spots + peak-timing model | Explore › Fall color layer and place pages, with status markers |
| Leaf Hunter leaf-check report (color %, note, photo) | Place page › Leaf check; saved as an atlas observation |
| Leaf Hunter watchlist | Saved places |
| Leaf Hunter photo downscaling | Generalized into `lib/photos.ts` (IndexedDB) |
| LOOKUP 21 dark-sky sites with sources and checked dates | Explore › Dark skies layer and place pages |
| LOOKUP astronomy (sun, moon, twilight) | "Tonight's sky" on every dark-sky page, computed offline |
| LOOKUP provenance rule (never invent a number) | Applied app-wide: Field guide / Your record / Suggestion / Estimate / Computed / iNaturalist tags |

**Deliberately not carried over:** Leaf Hunter's generated "demo" reports (they read as
observations and weren't), Leaf Hunter's Hunt/Chase/Color Wave planners, LOOKUP's full
go/no-go score with cloud forecast, OSRM routing and aurora (the dark-sky page links to
LOOKUP for that). These stay available in the original apps.

### New capabilities

- **Field Guide**: 46 common Colorado trees, shrubs and wildflowers (`src/data/species.ts`).
  Every entry carries a verified iNaturalist taxon id (checked against the live API:
  active taxon with research-grade Colorado records). Field-guide text is written for this
  app from standard regional knowledge and kept to well-established points; ranges are
  labelled approximate. Photos, Wikipedia summaries and month-by-month Colorado records
  load from iNaturalist at runtime, credited.
- **Identify**: there was no recognition to reuse and adding a paid vision API wasn't
  justified, so identification is a deterministic **field key** (needle bundles, leaf
  arrangement, shape, margin, distinctive features; flower color, form, zone). Results
  say "strong / possible / weak", show which answers disagreed, flag out-of-season
  flowers, offer look-alike comparisons, and state plainly that they come from the
  answers, not the photo. "Strong" needs two or more answers, all agreeing, with no tie.
- **Nearby nature**: every trail and place page lists plant species with research-grade
  iNaturalist records within 3 km. Guide species are matched by **taxon id**, never by name.
- **My Atlas**: species cards (found and not yet found), places, outings, journal by month,
  backup export/import, and import from Leaf Hunter and LOOKUP files.
- **Outings**: start one from any place; finds made while it runs attach to it and inherit
  its place; ending one at a trail offers to mark the trail hiked in the original log.
- **Quests**: nine deterministic challenges derived only from saved data.

## 3. Data model and rules

Stored in `localStorage` key `co-field-atlas-v1` (schema 1), photos in IndexedDB
`co-field-atlas/photos`. See `src/lib/atlas.ts`.

| Record | Identity | Notes |
| --- | --- | --- |
| Place | `trail:<id>`, `color:<id>`, `sky:<id>` | ids are the originals from each app, so nothing is remapped |
| Species | guide slug + `inat` taxon id | the shared record; the collection counts distinct species ids |
| Observation | random id (`lh-<report id>` when imported) | never merged; kind `find` or `leafcheck`; keeps key suggestions and answers |
| Outing | random id | one active at a time; deleting keeps its finds |
| Saved place | place ref | unique |
| Trail log | `co-trail-log-v1`, unchanged | still the source of truth for hiked / rating / notes |

Rules (all unit tested):

- **Dedup:** repeat finds of a species are separate observations on one species card.
- **No name matching:** iNaturalist records link to guide entries by taxon id only.
- **Untrusted storage:** loading sanitizes everything; unknown species or places become
  `null`, duplicate ids are dropped, dangling outing links are cleared, non-image thumbnails
  are rejected. Corrupt data yields an empty atlas, never a crash.
- **Privacy:** exact coordinates are stored only when the user ticks the box on a find,
  stay on the device, and can be removed later. Nothing is uploaded anywhere.

## 4. Migration

| Source | Migration | Status |
| --- | --- | --- |
| CO Trail Atlas | **None needed.** The merged app reads `co-trail-log-v1`, `co-trail-start-v1` and the forecast cache with the same keys, so at cutover on the same domain every existing log is simply there. The new store never writes those keys except through the existing log UI. | Tested (unit + e2e) |
| Leaf Hunter | Different origin (github.io), so the browser can't share storage. Import a JSON file `{ app: "leaf-hunter", reports, favorites }`: user leaf checks become `leafcheck` observations (photos moved to IndexedDB), favorites become saved places; demo reports and unknown spot ids are skipped; idempotent. Leaf Hunter itself needs a small "Export my data" button to produce the file. | Importer done and tested; export button proposed as a separate Leaf Hunter PR |
| LOOKUP | Its existing More › Export JSON is accepted: the chosen site becomes a saved place. Custom sites are counted and reported as not brought over (custom places aren't supported yet). Preferences stay in LOOKUP. | Done and tested |

All imports are additive and idempotent. Rolling back the app doesn't touch the
original apps' storage.

## 5. Verification

Automated, run on this branch:

- `npm run typecheck`: clean.
- `npm test` (Vitest): 242 tests. The original 106 Trail Atlas tests (2 updated for the
  rename and a second status region), 40 ported from LOOKUP and Leaf Hunter, and new
  tests for the store, sanitizing, imports, the key, quests, the iNaturalist client,
  astronomy and the cross-feature UI flows.
- `npm run build`: production build.
- `npm run test:e2e` (Playwright on the production build, iPhone 13, iPhone SE, desktop):
  the original atlas suite plus the full loop (trail → outing → **real photo upload through
  canvas** → key → save → atlas → photo survives reload in IndexedDB → quest), layers with a
  leaf check, species pages, touch-target sizes, no horizontal overflow, no console errors.

Integration checks against live services (from a Vercel sandbox, since this build container
can't reach them): iNaturalist `/taxa`, `/taxa/{id}`, `/observations/species_counts`,
`/observations/histogram` all answer with CORS `*` and no key; all 46 guide taxa resolve.
Open-Meteo is unchanged from production. **Not verified on a physical iPhone:** camera
capture permissions and HEIC conversion in real Safari. The e2e suite emulates iPhone
viewports in Chromium.

## 6. External services and limits

| Service | Use | Limits / license |
| --- | --- | --- |
| Open-Meteo | trailhead forecast (unchanged) | free, no key, non-commercial terms |
| iNaturalist API v1 | taxon photo + summary, Colorado month histogram, nearby species | no key; asks for well under 60 req/min. Cached on device (taxon 30 d, nearby 7 d) and fetched only when a page opens. Photos are CC licensed and always shown with their credit; uncredited thumbnails are not shown. |
| Google Fonts | Archivo, IBM Plex Mono | unchanged |
| HaveAnApp Pulse | anonymous usage counts | unchanged |

No environment variables, keys or secrets are required.

## 7. Production cutover

1. Merge this branch to `main` in `CO-Trails-Atlas`. Vercel builds it to
   co-trails-atlas.vercel.app; existing users keep their hiking log with no action.
   The service worker cache name was bumped (`atlas-v3`) so installed copies pick up the new shell.
2. Merge the Leaf Hunter export-button PR so Leaf Hunter users can bring their leaf checks over.
3. Optionally add a one-line pointer in Leaf Hunter and LOOKUP to the new app. Keep both
   originals deployed; they remain the full versions of their planners.

### Rollback

Vercel keeps every production deployment. To roll back, promote the previous production
deployment in the Vercel dashboard (or `vercel rollback`), or revert the merge commit on
`main`. Both are safe for data: the merged app never rewrote or deleted the original
`co-trail-*` keys, so the old app reads them exactly as before. Data created only in the
new app (`co-field-atlas-v1`, IndexedDB photos) stays on the device untouched and comes
back if the new version is re-deployed.

## 8. Deferred / next

- Photo-based identification (e.g. Pl@ntNet, free tier ~500 IDs/day, needs an API key held
  server-side in a Vercel function). The key's result format already has room for it.
- Sync across devices (needs accounts and a database; not justified until users ask).
- Custom places (LOOKUP custom sites), Leaf Hunter's Hunt/Chase planners, LOOKUP's full night score.
- More guide species (mushrooms, birds) once there's a reliable data source for each.
