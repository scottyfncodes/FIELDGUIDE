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

- **Explore.** 47 curated trails, 40 fall-color spots (Leaf Hunter's timing model) and 21
  dark-sky sites (LOOKUP's records) on one map with layers. Trail filters, sort, regions,
  drive rings and the batched Open-Meteo trailhead forecast work exactly as before. Every
  place page has directions, save, start an outing, log a find, your finds there, and plant
  species recorded nearby on iNaturalist. Dark-sky pages compute tonight's darkness and Moon
  on the phone; fall-color pages take a leaf check.
- **Identify.** Take a photo (or pick one), answer a few questions the photo can't, and the
  field key suggests matches as strong, possible or weak, with field marks, look-alikes and
  which answers disagreed. The photo is the record; it isn't analysed, and the screen says so.
- **Field Guide.** 46 common Colorado trees, shrubs and wildflowers, each tied to a verified
  iNaturalist taxon: how to know it, habitat, elevation, when to look, Colorado records by
  month, look-alikes, cautions, and your own sightings. Reached from search, results, the
  atlas and place pages.
- **My Atlas.** One collection: species cards, places, outings and a journal by month.
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
get preview deployments. No environment variables are needed. iNaturalist and Open-Meteo
are keyless; their usage limits are in docs/CONSOLIDATION.md.
