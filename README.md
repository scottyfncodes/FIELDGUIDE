# CO Trail Atlas

A field atlas of 47 hand-picked Colorado trails, styled like a USGS quad sheet.
Built for a phone at the trailhead: a real map of the state, drive-time rings
from where you're starting, today's forecast at every trailhead, and a personal
logbook that stays on the device. It installs to the Home Screen and works offline.

## What it does

- **Map.** Colorado in its true proportions, with the Continental Divide, I-25/I-70,
  the major ranges and reference towns. Region badges show how many trails each part
  of the state holds. Gestures: pan, pinch, fling, double-tap, and double-tap-drag for
  one-handed zoom. Tapping a tight cluster zooms into it; tapping a trail docks a
  preview card.
- **Discovery.** Search (names, towns, trailheads), region chips, difficulty, time on
  trail, in-season, not-hiked-yet and good-weather filters. Sort by nearest, best views,
  shortest or least climbing.
- **Trail sheet.** Distance, climb, estimated time and difficulty first, then directions,
  the trailhead forecast, when to go, what to know before you go, your field log and
  nearby après spots. Each trail has a shareable URL (`#trail=<id>`), and the back
  gesture closes the sheet.
- **Forecast.** One batched [Open-Meteo](https://open-meteo.com) request (free, no key)
  covering every trailhead's own grid cell. It loads automatically and is cached for
  3 hours within the same Colorado day.

Estimates are labeled as estimates. Drive times use a straight-line road model, and trail
times use AMC "book time" (30 min per mile plus 30 min per 1,000 ft of climbing).

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
| `npm run test:e2e` | Playwright against the production build: iPhone 13, iPhone SE, desktop |
| `npm run check` | All of the above |
| `npm run icons` | Re-render every app icon from `design/icon.svg` |

## Layout

```
index.html              app shell, PWA + iOS meta
public/                 manifest, icons, service worker (sw.js)
src/data/               trails.ts, areas.ts, geography.ts (regions, map features)
src/lib/                pure logic: geo, season, trails (filter/sort/time), weather, storage
src/components/         AtlasMap (the quad sheet), TrailDetail, small bits
src/App.tsx             state, URL sync, discovery UI, list
tests/unit/             vitest + Testing Library
tests/e2e/              Playwright
```

## Editing trails

Trails live in `src/data/trails.ts`. `lat`/`lon` are the **trailhead** (directions and the
forecast both use them). `npm test` validates every record: coordinates inside Colorado and
near their area town, known difficulty labels, a parseable season, no duplicate IDs or
names. Run it after any data change.

## Deploy

Vercel builds `main` with its Vite preset (`npm run build`, output `dist/`). No
environment variables are needed.
