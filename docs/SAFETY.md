# Safety & Survival: the SOS integration

Field Guide's Safety tab carries the outdoor material from the **SOS Offline Survival Guide**
(`scottyfncodes/SOS`, single `index.html`, shipping branch `claude/open-run-build-complete-rrk4y7`,
live at https://scottyfncodes.github.io/SOS/). SOS itself is unchanged and still the home of its
extended library. Same owner, no third-party content, so no licence change is involved.

## 1. Audit

### What SOS implements (verified in its source, not its README)

| Feature | Where in `index.html` | Notes |
| --- | --- | --- |
| 23 triage flows (menu, yes/no questions, results with severity, steps, "what not to do") | `TRIAGE_FLOWS` | Severe results show a `tel:911` box; moderate ones say "get care promptly" |
| Pressure bandaging and splinting step-throughs | `BANDAGE_STEPS`, `SPLINT_STEPS` | 4 SVG frames each |
| Outdoor articles: water, shelter, fire, navigation, signaling, weather, wildlife, vehicle | `renderWater` … `renderVehicle` | HTML strings inside render functions |
| Natural disasters: earthquakes, wildfires, tsunamis, volcanic ash, landslides | `renderDisasters` | |
| Extended: long-term survival, Rebuild From Zero, home, power outages, pandemic, civil unrest, infants/elderly/pets | `renderLongTerm` … `renderSpecialNeeds` | |
| Quick reference (10 facts), knowledge-check quiz | `QUICK_REF`, `QUIZ_QUESTIONS` | |
| Screen strobe and SOS pattern | `startStrobe` | 300 ms strobe; Morse SOS at a 200 ms unit |
| Keyword search over titles and hand-written keywords | `buildSearchIndex` | does not search body text |
| Favorites (localStorage `sos-favorites`), font size, units | | |
| Connect & Alerts (opt-in): Open-Meteo current weather + NWS alerts, Overpass facilities, USGS significant quakes (worldwide), Open-Meteo air quality | `runWeatherCheck` … `runAirQualityCheck` | |
| Print Full Guide (every section and flattened flow on one page) | `renderPrintAll` | |
| Service worker: network-first for same-origin GETs, cache fallback | `sw.js` | Precaches the shell; live APIs bypass it |
| Smoke test: offline load, triage, search, 320–430 px overflow, alert failure | `tests/smoke.test.js` | |

### What Field Guide already had

Location-first trail discovery, a daily Open-Meteo forecast per trailhead with a hike verdict,
plant key and wildlife ID, a plant guide, journal, quests, backup export/import, and a service
worker that cached the shell on install and other files only once fetched.

### Reused, adapted, left in SOS

| SOS | Field Guide | How |
| --- | --- | --- |
| Triage flows (all 23) | Safety tab, `#safety&flow=…` | **Reused verbatim**: generated into `src/data/safety/sos.ts` by evaluating SOS's own data |
| Bandage and splint step-throughs | First Aid page | Captions verbatim; drawings redrawn in the quad-sheet palette, same geometry |
| First-aid myths | First Aid page | Verbatim |
| Water, shelter, fire, navigation, signaling, weather, wildlife, vehicle | Reference articles | Text verbatim, converted to typed blocks; shelter and sky diagrams redrawn |
| Earthquakes, wildfires, landslides | One article, "Wildfires, Earthquakes & Landslides" | Verbatim sections |
| Quick reference | Quick Reference page | Verbatim |
| Emergency numbers, relief organizations | Emergency contacts page | Verbatim |
| Screen strobe | Signaling article | Same timings; flashing-light warning shown before it |
| Search | Safety search | Adapted: SOS's keyword lists for outdoor topics, plus body text and section titles |
| Favorites | Saved topics (`co-field-safety-saved-v1`) | New key; existing `co-trail-*` keys untouched |
| Print Full Guide | `#safety&topic=print` + print stylesheet | Adapted to the outdoor content |
| NWS alerts | Live conditions, and "Alerts here" on place pages | Adapted; failure handling fixed (below) |
| Air quality | Same | Labelled as a model estimate |
| Facilities (Overpass) | "Nearby help" | Adds clinics and ranger stations, 25 km |
| USGS quakes | Earthquakes | M2.5+ past week within 300 km (SOS showed worldwide significant quakes) |
| Open-Meteo current weather | Not ported | Field Guide's forecast already covers weather; no competing forecast |
| Water and calorie calculators | Not ported | The purification table and quick reference carry the numbers |
| Quiz | Not ported | Not needed in the field |
| Tsunamis, volcanic ash, long-term, Rebuild From Zero, home, outages, pandemic, civil unrest, special needs | **Left in SOS** | Linked from the Safety page as SOS's extended library |
| Font-size setting | Not ported | The Safety screens use larger type throughout and work with browser zoom |

### Concerns found

- **Medical review.** None of the first-aid content has been reviewed by a clinician. Every
  first-aid screen says so. See §3 for the items to review first.
- **SOS bug, fixed in the port:** when the NWS request failed, SOS showed "No active NWS alerts".
  Here a failed request reads "This is not an all-clear", and an empty answer says it doesn't mean
  the area is safe.
- **SOS display bug, fixed:** "First Aid &gt; Burn" in the clothing-fire result was escaped twice
  and showed the entity text. It now reads "First Aid > Burn".
- **Data freshness.** Alerts are marked stale after 1 hour, air quality after 3, quakes after 6,
  facilities after 30 days. Cached answers show their age and point.
- **APIs.** All four sources are free and keyless, called from the phone. No backend, no secrets,
  no new dependencies. NWS asks API users for a User-Agent; browsers can't set one and NWS serves
  browsers without it.
- **Privacy.** Location is asked for only when "Use my location" is tapped on Live conditions. The
  coordinates go only to the named sources. Place pages check the place's own point, so no
  permission is needed there.

## 2. Architecture

```
src/data/safety/types.ts     block, article and triage types
src/data/safety/sos.ts       GENERATED from SOS: articles, triage flows, quick ref, contacts
src/lib/safety.ts            lookups, on-device search, saved topics, place-page context links
src/lib/hazards.ts           live sources, parsers, staleness, local cache (co-field-hazards-v1)
src/screens/Safety.tsx       the Safety tab: index, articles, first aid, triage, live, contacts, print
src/components/SafetyBits.tsx      block renderer, call box, severity, medical note, strobe
src/components/SafetyFigures.tsx   redrawn SOS diagrams and the step-through viewer
src/components/HazardPanel.tsx     opt-in live checks with source, time, scope, stale and failure states
src/components/BeReady.tsx         the place-page section
public/sw.js + vite.config.ts      build-stamped precache
```

Routes are hash params on the Safety tab: `#safety`, `#safety&topic=weather`,
`#safety&flow=bleeding:severe`, `#safety&topic=live`, `#safety&topic=print`.

**Regenerating `sos.ts`.** The port was produced by loading SOS's script in a Node `vm`, calling its
own render functions, and converting the HTML to blocks with jsdom. If SOS's wording changes, change
it in both places; `tests/unit/fixtures/sos-excerpts.txt` spot-checks key safety lines against the port.

### Offline and the service worker

- The build stamps `sw.js` with a content hash and the list of every built file. Install precaches
  all of them, so after one visit the whole app, Safety included, starts with no network, even on a
  screen never opened before.
- If any file fails to download, the install fails and the old worker keeps serving the old,
  complete version. Old caches are removed only after the new one is complete.
- Pages are network-first with a 4-second timeout, then the saved copy.
- Live data is never cached by the worker; the app keeps its own dated copies.
- The Safety page says whether it is saved for offline use, or offline right now.

## 3. Content to review before calling it authoritative

Kept as written in SOS, flagged for a medical or specialist reviewer:

1. **Snakebite:** "Keep the bitten limb below heart level." Several current wilderness-medicine
   sources advise keeping it at about heart level.
2. **Shock:** "elevate the legs about 12 in." Current first-aid guidance treats leg raising as
   optional rather than standard.
3. **Chest pain:** "Don't give aspirin … unless it's their own prescribed medication or a dispatcher
   tells you to." Many guidelines suggest chewing aspirin for a suspected heart attack if not allergic.
4. **Dehydration:** "a pinch of salt and sugar per liter" differs from SOS's own quiz recipe
   (6 level tsp sugar + 1/2 level tsp salt per liter, the WHO home recipe).
5. **Severe bleeding:** tourniquet "2-3 in (5-8 cm) above the wound". Some courses now teach
   "high and tight" when the wound site is unclear.
6. **Weather / cold:** "most heat is lost from the head, hands, and feet" is a common myth; heat
   loss is roughly proportional to exposed skin.
7. **Wildlife:** brown/grizzly bear advice is general; Colorado's resident bear is the black bear.
   Kept as general reference, labelled as such.
8. **Frostbite** rewarming at 100-105°F (37-40°C): check against current guidance.

## 4. What the app does not do

It doesn't diagnose, call or dispatch anyone, or know a trail's hazards. Place pages offer general
reading (labelled General reference) beside an opt-in check of official alerts for that point
(labelled Official source) and modelled air quality (labelled Model).
