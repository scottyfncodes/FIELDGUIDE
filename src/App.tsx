import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Log, LogEntry, StartPoint } from "./data/types";
import { AREAS } from "./data/areas";
import { TRAILS } from "./data/trails";
import { START_PRESETS } from "./data/geography";
import { speciesById } from "./data/species";
import { LOG_KEY, START_KEY, WX_KEY, loadKey, saveKey } from "./lib/storage";
import { fetchForecast, isFresh } from "./lib/weather";
import type { WxPayload } from "./lib/weather";
import { activeOuting, observationsOn, useAtlas } from "./lib/atlas";
import { placeByRef } from "./lib/places";
import type { PlaceRef } from "./lib/places";
import { useRoute } from "./lib/router";
import type { Tab } from "./lib/router";
import { Explore } from "./screens/Explore";
import type { ExploreHandle } from "./screens/Explore";
import { Identify } from "./screens/Identify";
import { Atlas } from "./screens/Atlas";
import { Quests } from "./screens/Quests";
import { TrailDetail } from "./components/TrailDetail";
import { PlaceDetail } from "./components/PlaceDetail";
import { GuideIndex, ObservationSheet, OutingSheet, SpeciesPage } from "./components/Sheets";
import { ActionsCtx } from "./components/PlaceSections";
import type { Actions } from "./components/PlaceSections";
import { Toast, fmtDuration } from "./components/atlasBits";
import { TabIcon } from "./components/Glyphs";

const TRAIL_BY_ID = new Map(TRAILS.map((t) => [t.id, t]));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const TAB_LABEL: Record<Tab, string> = { explore: "Explore", identify: "Identify", atlas: "My Atlas", quests: "Quests" };

const loadStart = (): StartPoint => {
  const s = loadKey<StartPoint>(START_KEY);
  return s && typeof s.lat === "number" && typeof s.lon === "number" && s.label ? s : START_PRESETS[0];
};

export default function App() {
  const [route, nav] = useRoute();
  const atlas = useAtlas();
  const [log, setLog] = useState<Log>(() => loadKey<Log>(LOG_KEY) || {});
  const [start, setStart] = useState<StartPoint>(loadStart);
  const [wx, setWx] = useState<WxPayload | null>(() => {
    const c = loadKey<WxPayload>(WX_KEY);
    return isFresh(c) ? c : null;
  });
  const [wxBusy, setWxBusy] = useState(false);
  const [wxErr, setWxErr] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
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

  const chooseStart = (s: StartPoint) => { setStart(s); setLocErr(null); saveKey(START_KEY, s); };
  const locateMe = () => {
    if (!navigator.geolocation) { setLocErr("Location isn't available here. Pick a town instead."); return; }
    setLocBusy(true); setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocBusy(false); chooseStart({ key: "gps", label: "My location", lat: pos.coords.latitude, lon: pos.coords.longitude }); },
      () => { setLocBusy(false); setLocErr("Couldn't read your location. Pick a town instead."); },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  };

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
    openObs: (id) => openSheet("obs", id),
    openOuting: (id) => openSheet("outing", id),
    openGuide: () => openSheet("guide", "all"),
    openPlace: (ref) => {
      const p = placeByRef(ref);
      if (!p) return;
      if (p.kind === "trail") openSheet("trail", p.id);
      else openSheet("place", p.ref);
    },
    identifyAt: (ref: PlaceRef | null) => nav.go({ tab: "identify", sheet: null, params: ref ? { at: ref } : {} }),
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
  const sheetOpen = !!(trail || (place && place.kind !== "trail") || species || sheet?.type === "obs" || sheet?.type === "guide" || sheet?.type === "outing");

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

  return (
    <ActionsCtx.Provider value={actions}>
      <div className="app">
        <header className="appbar" {...behindSheet}>
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">▲</span>
            <h1>CO Field Atlas</h1>
          </div>
          {route.tab === "explore" && (
            <div className="appbar-right">
              <span className="tally" aria-label={`${doneCount} of ${TRAILS.length} trails hiked`}>
                <b>{doneCount}</b>/{TRAILS.length} hiked
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
            <Explore ref={exploreRef} log={log} patchLog={patchLog} start={start} chooseStart={chooseStart}
              locateMe={locateMe} locBusy={locBusy} locErr={locErr} wx={wx} wxErr={wxErr}
              openTrailId={trail?.id ?? null} />
          </div>
          {route.tab === "identify" && <Identify at={(placeByRef(route.params.at)?.ref) ?? null} onDone={() => { nav.go({ tab: "atlas", sheet: null, params: {} }, { replace: true }); window.scrollTo({ top: 0 }); }} />}
          {route.tab === "atlas" && <Atlas log={log} />}
          {route.tab === "quests" && <Quests />}
        </main>

        <nav className="tabbar" aria-label="Sections" {...behindSheet}>
          {(["explore", "identify", "atlas", "quests"] as Tab[]).map((t) => (
            <button key={t} type="button" className={"tab" + (route.tab === t ? " on" : "")}
              aria-current={route.tab === t ? "page" : undefined} onClick={() => nav.tab(t)}>
              <TabIcon tab={t} />
              <span>{TAB_LABEL[t]}</span>
            </button>
          ))}
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
            <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={trail || place ? "det-name" : undefined}
              aria-label={trail || place ? undefined : "Details"} onClick={(e) => e.stopPropagation()}>
              {trail && (
                <TrailDetail key={trail.id} t={trail} area={AREAS[trail.area]} start={start}
                  w={wx?.byTrail?.[trail.id] ?? null} p={log[trail.id] || {}}
                  onPatch={(patch) => patchLog(trail.id, patch)} onClose={closeSheet} onShowOnMap={() => showOnMap(trail.id)} />
              )}
              {place && place.kind !== "trail" && <PlaceDetail key={place.ref} place={place} start={start} onClose={closeSheet} />}
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
