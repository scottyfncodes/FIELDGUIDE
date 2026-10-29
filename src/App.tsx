import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Log, LogEntry, StartPoint } from "./data/types";
import { AREAS } from "./data/areas";
import { TRAILS } from "./data/trails";
import { speciesById } from "./data/species";
import { LOG_KEY, RADIUS_KEY, START_KEY, WX_KEY, loadKey, saveKey } from "./lib/storage";
import { RADIUS_PRESETS } from "./lib/discover";
import type { Origin } from "./lib/discover";
import { fetchForecast, isFresh } from "./lib/weather";
import type { WxPayload } from "./lib/weather";
import { activeOuting, observationsOn, useAtlas } from "./lib/atlas";
import { placeByRef } from "./lib/places";
import type { PlaceRef } from "./lib/places";
import { useRoute } from "./lib/router";
import { TABS } from "./lib/router";
import type { Tab } from "./lib/router";
import { Explore, startOf } from "./screens/Explore";
import type { ExploreHandle } from "./screens/Explore";
import { Identify } from "./screens/Identify";
import { Atlas } from "./screens/Atlas";
import { Quests } from "./screens/Quests";
import { Safety } from "./screens/Safety";
import { TrailDetail } from "./components/TrailDetail";
import { PlaceDetail } from "./components/PlaceDetail";
import { GuideIndex, ObservationSheet, OutingSheet, SpeciesPage } from "./components/Sheets";
import { FoundTrailDetail } from "./components/FoundTrailDetail";
import { TaxonPage } from "./components/Wildlife";
import { ActionsCtx } from "./components/PlaceSections";
import type { Actions } from "./components/PlaceSections";
import { Toast, fmtDuration } from "./components/atlasBits";
import { TabIcon } from "./components/Glyphs";

const TRAIL_BY_ID = new Map(TRAILS.map((t) => [t.id, t]));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const TAB_LABEL: Record<Tab, string> = { explore: "Explore", identify: "Nature ID", atlas: "Journal", quests: "Quests", safety: "Safety" };

/* The last place the person searched from, kept in the original start-point
   key and shape. Nothing is assumed when there isn't one: Explore asks. */
const loadOrigin = (): Origin | null => {
  const s = loadKey<StartPoint>(START_KEY);
  if (!s || typeof s.lat !== "number" || typeof s.lon !== "number" || !s.label) return null;
  return s.key === "gps" ? { kind: "gps", lat: s.lat, lon: s.lon, label: /^near /i.test(s.label) ? s.label : "Your last location" } : { kind: "place", lat: s.lat, lon: s.lon, label: s.label };
};
const loadRadius = (): number => {
  const r = loadKey<number>(RADIUS_KEY);
  return RADIUS_PRESETS.includes(r as (typeof RADIUS_PRESETS)[number]) ? (r as number) : 10;
};

export default function App() {
  const [route, nav] = useRoute();
  const atlas = useAtlas();
  const [log, setLog] = useState<Log>(() => loadKey<Log>(LOG_KEY) || {});
  const [origin, setOrigin] = useState<Origin | null>(loadOrigin);
  const [radius, setRadius] = useState<number>(loadRadius);
  const start = startOf(origin);
  const [wx, setWx] = useState<WxPayload | null>(() => {
    const c = loadKey<WxPayload>(WX_KEY);
    return isFresh(c) ? c : null;
  });
  const [wxBusy, setWxBusy] = useState(false);
  const [wxErr, setWxErr] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [hikePrompt, setHikePrompt] = useState<string | null>(null); // trail id
  const exploreRef = useRef<ExploreHandle>(null);
  const toastTimer = useRef<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  /* ---- persistence: the CO Trail Atlas log, same key as ever ---- */
  useEffect(() => { saveKey(LOG_KEY, log); }, [log]);
  const patchLog = useCallback((id: string, patch: LogEntry) => {
    setLog((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }, []);

  const chooseOrigin = useCallback((o: Origin) => {
    setOrigin(o);
    saveKey(START_KEY, { key: o.kind, label: o.label, lat: o.lat, lon: o.lon });
  }, []);
  const chooseRadius = useCallback((r: number) => { setRadius(r); saveKey(RADIUS_KEY, r); }, []);

  /* ---- forecast: fetched automatically once a day-ish, refreshable ---- */
  const refreshWeather = useCallback(async () => {
    setWxBusy(true); setWxErr(null);
    try {
      const payload = await fetchForecast(TRAILS);
      setWx(payload);
      saveKey(WX_KEY, payload);
    } catch {
      setWxErr(navigator.onLine === false ? "Offline. The forecast will load when you have signal." : "Couldn't reach the forecast. Tap to retry.");
    } finally {
      setWxBusy(false);
    }
  }, []);
  useEffect(() => { if (!wx) refreshWeather(); }, []);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const openSheet = useCallback((type: Parameters<typeof nav.openSheet>[0], id: string) => {
    if (!route.sheet) returnFocus.current = document.activeElement as HTMLElement | null;
    nav.openSheet(type, id);
  }, [nav, route.sheet]);

  const actions: Actions = useMemo(() => ({
    openSpecies: (id) => openSheet("species", id),
    openTaxon: (id) => openSheet("taxon", String(id)),
    openFound: (id) => openSheet("found", id),
    openObs: (id) => openSheet("obs", id),
    openOuting: (id) => openSheet("outing", id),
    openGuide: () => openSheet("guide", "all"),
    openPlace: (ref) => {
      const p = placeByRef(ref);
      if (!p) return;
      if (p.kind === "trail") openSheet("trail", p.id);
      else if (p.kind === "found") openSheet("found", p.id);
      else openSheet("place", p.ref);
    },
    identifyAt: (ref: PlaceRef | null) => nav.go({ tab: "identify", sheet: null, params: ref ? { at: ref } : {} }),
    openSafety: (params) => { returnFocus.current = null; nav.go({ tab: "safety", sheet: null, params }); },
    onOutingEnded: (ref, suggestHiked) => {
      const id = ref?.startsWith("trail:") ? ref.slice(6) : null;
      if (id && suggestHiked && !log[id]?.done) setHikePrompt(id);
      else toast("Outing saved to your atlas");
    },
    toast,
  }), [openSheet, nav, log, toast]);

  const closeSheet = useCallback(() => {
    nav.closeSheet();
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected) requestAnimationFrame(() => el.focus({ preventScroll: true }));
  }, [nav]);

  const sheet = route.sheet;
  const trail = sheet?.type === "trail" ? TRAIL_BY_ID.get(sheet.id) : undefined;
  const place = sheet?.type === "place" ? placeByRef(sheet.id) : undefined;
  const species = sheet?.type === "species" ? speciesById(sheet.id) : undefined;
  const taxonId = sheet?.type === "taxon" && /^\d+$/.test(sheet.id) ? Number(sheet.id) : null;
  const foundId = sheet?.type === "found" ? sheet.id : null;
  const sheetOpen = !!(trail || (place && place.kind !== "trail" && place.kind !== "found") || species || taxonId || foundId ||
    sheet?.type === "obs" || sheet?.type === "guide" || sheet?.type === "outing");

  useEffect(() => {
    if (!sheetOpen) return;
    document.body.classList.add("sheet-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("sheet-open"); window.removeEventListener("keydown", onKey); };
  }, [sheetOpen, closeSheet]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [route.tab]);

  const showOnMap = (id: string) => {
    const t = TRAIL_BY_ID.get(id);
    returnFocus.current = null;
    nav.go({ tab: "explore", sheet: null }, { replace: true });
    if (t) requestAnimationFrame(() => exploreRef.current?.showOnMap(t, "trail"));
  };

  const doneCount = TRAILS.filter((t) => log[t.id]?.done).length;
  const wxTime = wx && new Date(wx.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const wxLabel = wxBusy ? "Updating" : wx ? wxTime : wxErr ? "Retry" : "Forecast";
  const behindSheet = sheetOpen ? ({ inert: "" } as Record<string, string>) : {};
  const out = activeOuting(atlas);
  const outPlace = placeByRef(out?.placeRef);
  const prompted = hikePrompt ? TRAIL_BY_ID.get(hikePrompt) : undefined;
  /* each sheet is its own scene: a trail in forest and parchment, a plant in sage and terracotta */
  const sheetScene = trail || foundId ? "explore" : place ? place.kind : species || sheet?.type === "guide" ? "botany" : taxonId ? "identify" : "atlas";

  return (
    <ActionsCtx.Provider value={actions}>
      <div className="app" data-scene={route.tab}>
        <header className="appbar" {...behindSheet}>
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">▲</span>
            <h1>Field Guide</h1>
          </div>
          {route.tab === "explore" && (
            <div className="appbar-right">
              {/* the log covers the curated atlas classics, so the count says so (search results can run to hundreds) */}
              <span className="tally" aria-label={`${doneCount} of ${TRAILS.length} atlas classics hiked`}>
                <b>{doneCount}</b>/{TRAILS.length} classics<span className="tally-word"> hiked</span>
              </span>
              <button type="button" className="wx-btn" onClick={refreshWeather} disabled={wxBusy}
                aria-label={wxBusy ? "Loading forecast" : wx ? `Forecast from ${wxTime}. Refresh` : "Load today's forecast"}>
                <span className={"wx-ico" + (wxBusy ? " spin" : "")} aria-hidden="true">↻</span> {wxLabel}
              </button>
            </div>
          )}
        </header>

        {out && (
          <div className="outing-strip" {...behindSheet}>
            <button type="button" className="os-main" onClick={() => actions.openOuting(out.id)} aria-label={`Outing in progress at ${outPlace?.name ?? "an unnamed place"}. Open it`}>
              <span className="os-dot" aria-hidden="true" />
              <span><b>{outPlace?.name ?? "Outing"}</b> · {fmtDuration(out.startedAt, null)} · {plural(observationsOn(atlas, out.id).length, "find")}</span>
            </button>
            <button type="button" className="os-log" onClick={() => actions.identifyAt(out.placeRef)}>Log a find</button>
          </div>
        )}

        <main className="tab-body" {...behindSheet}>
          <div hidden={route.tab !== "explore"}>
            <Explore ref={exploreRef} log={log} patchLog={patchLog} origin={origin} onOrigin={chooseOrigin}
              radiusMi={radius} onRadius={chooseRadius} wx={wx} wxErr={wxErr} onRetryWx={refreshWeather}
              openTrailId={trail?.id ?? null} />
          </div>
          {route.tab === "identify" && <Identify at={(placeByRef(route.params.at)?.ref) ?? null} near={origin} onDone={() => { nav.go({ tab: "atlas", sheet: null, params: {} }, { replace: true }); window.scrollTo({ top: 0 }); }} />}
          {route.tab === "atlas" && <Atlas log={log} />}
          {route.tab === "quests" && <Quests />}
          {route.tab === "safety" && <Safety params={route.params} origin={origin}
            go={(params, o) => nav.go({ tab: "safety", sheet: null, params }, o)} />}
        </main>

        <nav className="tabbar" aria-label="Sections" {...behindSheet}>
          {TABS.map((t) => (
            <button key={t} type="button" className={"tab" + (route.tab === t ? " on" : "")}
              aria-current={route.tab === t ? "page" : undefined} onClick={() => nav.tab(t)}>
              <TabIcon tab={t} />
              <span>{TAB_LABEL[t]}</span>
            </button>
          ))}
          {/* the index tab slides to the current section (last child, so the buttons keep their order) */}
          <span className="tab-ink" aria-hidden="true"
            style={{ ["--i" as string]: TABS.indexOf(route.tab) }} />
        </nav>

        {prompted && (
          <div className="hike-prompt" role="dialog" aria-label="Mark trail as hiked">
            <p>Outing saved. Mark <b>{prompted.name}</b> as hiked in your trail log?</p>
            <div className="id-actions">
              <button type="button" className="pa-btn" onClick={() => setHikePrompt(null)}>Not now</button>
              <button type="button" className="pa-btn pa-primary" onClick={() => { patchLog(prompted.id, { done: true }); setHikePrompt(null); toast("Logged as hiked"); }}>Mark hiked</button>
            </div>
          </div>
        )}

        <Toast msg={toastMsg} />

        {sheetOpen && (
          <div className="sheet-scrim" onClick={closeSheet}>
            <div className="sheet" data-scene={sheetScene} role="dialog" aria-modal="true" aria-labelledby={trail || place ? "det-name" : undefined}
              aria-label={trail || place ? undefined : "Details"} onClick={(e) => e.stopPropagation()}>
              {trail && (
                <TrailDetail key={trail.id} t={trail} area={AREAS[trail.area]} start={start}
                  w={wx?.byTrail?.[trail.id] ?? null} p={log[trail.id] || {}}
                  onPatch={(patch) => patchLog(trail.id, patch)} onClose={closeSheet} onShowOnMap={() => showOnMap(trail.id)} />
              )}
              {place && place.kind !== "trail" && place.kind !== "found" && <PlaceDetail key={place.ref} place={place} start={start} onClose={closeSheet} />}
              {foundId && <FoundTrailDetail key={foundId} id={foundId} origin={origin} onClose={closeSheet} />}
              {taxonId && <TaxonPage key={taxonId} id={taxonId} near={origin} onClose={closeSheet} />}
              {species && <SpeciesPage key={species.id} s={species} onClose={closeSheet} />}
              {sheet?.type === "guide" && <GuideIndex onClose={closeSheet} />}
              {sheet?.type === "obs" && <ObservationSheet key={sheet.id} id={sheet.id} onClose={closeSheet} />}
              {sheet?.type === "outing" && <OutingSheet key={sheet.id} id={sheet.id} onClose={closeSheet} />}
            </div>
          </div>
        )}
      </div>
    </ActionsCtx.Provider>
  );
}
