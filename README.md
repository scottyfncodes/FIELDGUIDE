# CO Field Atlas

**The world is full of things you haven't noticed yet.**

Colorado trails, fall color and dark skies on one quad-sheet map, a field guide to the
plants along the way, and your own atlas of what you find. Built for a phone at the
trailhead: it installs to the Home Screen, works offline, and keeps everything on the device.

CO Field Atlas is the merger of three HaveAnApp apps: **CO Trail Atlas** (this repo,
the base), **Leaf Hunter** (fall color) and **LOOKUP** (dark skies). See
[docs/CONSOLIDATION.md](docs/CONSOLIDATION.md) for the audit, what moved where, the data
model, migration, and the cutover and rollback plan.

## What it does

- **Explore, location first.** Start from "Use my location" or any address, town, ZIP, park
  or trailhead (OSM Nominatim, Photon fallback). Trails within 5–50 miles come live from
  COTREX (Colorado's statewide trail map), the Forest Service (every national forest) and
  OpenStreetMap, merged into one card per trail, ranked by straight-line distance, paged,
  and drawn on a field sheet around the search point. The 47 curated **atlas classics**,
  40 fall-color spots and 21 dark-sky sites are still here. There are no preset starting
  towns any more. See [docs/DISCOVERY.md](docs/DISCOVERY.md). Every
  place page has directions, save, start an outing, log a find, your finds there, and plant
  species recorded nearby on iNaturalist. Dark-sky pages compute tonight's darkness and Moon
  on the phone; fall-color pages take a leaf check.
- **Nature ID.** Plants: take a photo, answer a few questions, and the field key suggests
  matches as strong, possible or weak. The photo isn't analysed. Birds, insects and other
  animals: compare your photo with species recorded nearby on iNaturalist, or search by
  name. Where the site has photo recognition switched on (`ANTHROPIC_API_KEY`), a vision
  model suggests candidates. They're hedged, capped by photo quality, and resolved to
  iNaturalist taxa by id.
- **Field Guide.** 46 common Colorado trees, shrubs and wildflowers, each tied to a verified
  iNaturalist taxon: how to know it, habitat, elevation, when to look, Colorado records by
  month, look-alikes, cautions, and your own sightings. Reached from search, results, the
  atlas and place pages.
- **Field Journal** (the My Atlas tab). One collection: plant and wildlife cards, places
  (including saved search trails), outings and a journal by month. Location on a
  sighting is optional (none, about 1 km, or exact) and never kept for sensitive species.
  Repeat finds stack on one card. Backup export/import, and import from Leaf Hunter and LOOKUP.
- **Quests.** Optional challenges computed from what you've saved, never from taps.

Every value says what it is: field guide, your record, suggestion, estimate, computed, or
iNaturalist. Estimates are labelled as estimates.

## Develop

```sh
npm install
npm run dev          # http://localhost:5173
```

| Script | What it runs |
| --- | --- |
| `npm run build` | Production build to `dist/` (what Vercel runs) |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm test` | Vitest: data integrity, logic, and component tests of the real UI flows |
| `npm run test:e2e` | Playwright against the production build: iPhone 13, iPhone SE, desktop. Set `PW_CHROMIUM` to use a preinstalled Chromium |
| `npm run check` | All of the above |
| `npm run icons` | Re-render every app icon from `design/icon.svg` |

## Layout

```
index.html              app shell, PWA + iOS meta
public/                 manifest, icons, service worker (sw.js)
src/data/               trails, areas, geography; foliage (Leaf Hunter), darksky (LOOKUP), species (field guide)
src/lib/                pure logic: geo, season, trails, weather, storage,
                        places (one index over all three catalogs), atlas (the collection store),
                        identify (the key), quests, inat (iNaturalist client), photos (IndexedDB),
                        importers, router, tonight; astro/ (from LOOKUP), foliage/ (from Leaf Hunter)
src/screens/            Explore, Identify, Atlas, Quests
src/components/         AtlasMap, TrailDetail, PlaceDetail, Sheets (species, guide, find, outing), shared bits
src/App.tsx             shell: tabs, sheets, trail state, forecast
tests/unit/             vitest + Testing Library
tests/e2e/              Playwright
docs/CONSOLIDATION.md   the merger: audit, architecture, data, cutover, rollback
```

## Editing species

Species live in `src/data/species.ts`. Each needs a real iNaturalist taxon id (`inat`) and
traits whose values are choices the key offers; `npm test` checks both, plus cross-links
and copy rules. Keep text to well-established points and leave out anything you can't stand behind.

## Editing trails

Trails live in `src/data/trails.ts`. `lat`/`lon` are the **trailhead** (directions and the
forecast both use them). `npm test` validates every record: coordinates inside Colorado and
near their area town, known difficulty labels, a parseable season, no duplicate IDs or
names. Run it after any data change.

## Deploy

Vercel builds `main` with its Vite preset (`npm run build`, output `dist/`); pull requests
get preview deployments. `api/identify.ts` deploys as a Vercel Function. No environment
variables are required. `ANTHROPIC_API_KEY` (server-side only) switches on photo
recognition; see docs/DISCOVERY.md for cost and guard rails. iNaturalist, Open-Meteo,
Nominatim, Photon, COTREX, the Forest Service layer and Overpass are all keyless.
