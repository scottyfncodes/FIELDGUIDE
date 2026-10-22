import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Log, LogEntry, StartPoint, Trail } from "./data/types";
import { AREAS } from "./data/areas";
import { TRAILS } from "./data/trails";
import { REGIONS, START_PRESETS } from "./data/geography";
import { driveMin, fmtDrive } from "./lib/geo";
import { MONTH_LBL, currentMonth } from "./lib/season";
import { LOG_KEY, START_KEY, WX_KEY, loadKey, saveKey } from "./lib/storage";
import {
  DIFF_BUCKETS, EMPTY_FILTERS, SORT_OPTS, TIME_OPTS, activeFilterCount, bookHours, filterTrails, fmtHours, sortTrails,
} from "./lib/trails";
import type { DiffBucket, Filters, SortKey, TimeBucket } from "./lib/trails";
import { fetchForecast, isFresh, verdict } from "./lib/weather";
import type { WxPayload } from "./lib/weather";
import { AtlasMap } from "./components/AtlasMap";
import type { AtlasMapHandle } from "./components/AtlasMap";
import { TrailDetail } from "./components/TrailDetail";
import { ChipSelect, DiffTag, ToggleChip, VerdictChip } from "./components/bits";

const TRAIL_BY_ID = new Map(TRAILS.map((t) => [t.id, t]));

/* #trail=<id> makes a trail linkable and lets the back gesture close the sheet */
const trailFromHash = (): string | null => {
  const m = /^#trail=([\w-]+)$/.exec(window.location.hash);
  return m && TRAIL_BY_ID.has(m[1]) ? m[1] : null;
};

const loadStart = (): StartPoint => {
  const s = loadKey<StartPoint>(START_KEY);
  return s && typeof s.lat === "number" && typeof s.lon === "number" && s.label ? s : START_PRESETS[0];
};

export default function App() {
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
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("near");
  const [sel, setSel] = useState<string | null>(trailFromHash);
  const [detail, setDetail] = useState<string | null>(trailFromHash);
  const mapRef = useRef<AtlasMapHandle>(null);
  const mapSecRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const month = currentMonth();

  /* ---- persistence ---- */
  useEffect(() => { saveKey(LOG_KEY, log); }, [log]);

  const patchLog = useCallback((id: string, patch: LogEntry) => {
    setLog((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }, []);

  const chooseStart = (s: StartPoint) => {
    setStart(s); setLocErr(null);
    saveKey(START_KEY, s);
  };

  const locateMe = () => {
    if (!navigator.geolocation) { setLocErr("Location isn't available here. Pick a town instead."); return; }
    setLocBusy(true); setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        chooseStart({ key: "gps", label: "My location", lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setLocBusy(false);
        setLocErr("Couldn't read your location. Pick a town instead.");
      },
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

  useEffect(() => {
    if (!wx) refreshWeather(); // once, on launch
  }, []);

  const verdictFor = useCallback((t: Trail) => verdict(wx?.byTrail?.[t.id]), [wx]);

  /* ---- detail sheet <-> URL hash ---- */
  useEffect(() => {
    const sync = () => {
      const id = trailFromHash();
      setDetail(id);
      if (id) setSel(id);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const openDetail = (id: string) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setSel(id);
    setDetail(id);
    if (trailFromHash() !== id) window.history.pushState({ trail: id }, "", `#trail=${id}`);
  };

  const closeDetail = useCallback(() => {
    setDetail(null);
    if (window.history.state?.trail) window.history.back();
    else if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected) requestAnimationFrame(() => el.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!detail) return;
    document.body.classList.add("sheet-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDetail(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("sheet-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [detail, closeDetail]);

  const showOnMap = (t: Trail) => {
    returnFocus.current = null;
    closeDetail();
    setSel(t.id);
    requestAnimationFrame(() => {
      mapSecRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      mapRef.current?.flyToTrail(t);
    });
  };

  /* ---- discovery ---- */
  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const effective: Filters = {
    ...filters,
    goodWx: filters.goodWx && !!wx,
    regionAreas: filters.region ? REGIONS.find((r) => r.key === filters.region)?.areas : undefined,
  };

  const filtered = useMemo(
    () => filterTrails(TRAILS, effective, { areas: AREAS, log, month, verdictFor }),
    [filters, wx, log, month, verdictFor],
  );
  const sorted = useMemo(() => sortTrails(filtered, sort, start), [filtered, sort, start]);

  const groups = useMemo(() => {
    if (sort !== "near") return null;
    const byArea = new Map<string, Trail[]>();
    sorted.forEach((t) => byArea.set(t.area, [...(byArea.get(t.area) || []), t]));
    return [...byArea.entries()]
      .map(([key, trails]) => ({ key, trails, min: driveMin(start, AREAS[key]) }))
      .sort((a, b) => (a.min ?? 0) - (b.min ?? 0));
  }, [sorted, sort, start]);

  const pickRegion = (key: string) => {
    const on = filters.region === key ? null : key;
    setF("region", on);
    if (!on) { mapRef.current?.reset(); return; }
    const areas = REGIONS.find((r) => r.key === on)!.areas;
    const inRegion = filtered.filter((t) => areas.includes(t.area));
    mapRef.current?.flyToTrails(inRegion.length ? inRegion : TRAILS.filter((t) => areas.includes(t.area)));
  };

  const clearFilters = () => {
    if (filters.region) mapRef.current?.reset();
    setFilters(EMPTY_FILTERS);
  };

  const doneCount = TRAILS.filter((t) => log[t.id]?.done).length;
  const nFilters = activeFilterCount(effective);
  const selTrail = sel ? TRAIL_BY_ID.get(sel) : undefined;
  const detailTrail = detail ? TRAIL_BY_ID.get(detail) : undefined;
  const regionCounts = useMemo(() => {
    const noRegion = filterTrails(TRAILS, { ...effective, regionAreas: undefined }, { areas: AREAS, log, month, verdictFor });
    return Object.fromEntries(REGIONS.map((r) => [r.key, noRegion.filter((t) => r.areas.includes(t.area)).length]));
  }, [filters, wx, log, month, verdictFor]);

  const startOptions = [
    ...START_PRESETS.map((p) => ({ key: p.key, label: p.label })),
    { key: "gps", label: start.key === "gps" ? "My location (update)" : "Use my location" },
  ];

  const row = (t: Trail, showArea: boolean) => {
    const p = log[t.id] || {};
    const v = verdictFor(t);
    return (
      <li key={t.id} className={"row" + (sel === t.id ? " row-sel" : "") + (p.done ? " row-done" : "")}>
        <button type="button" className="row-main" onClick={() => openDetail(t.id)}>
          <span className="row-top">
            <span className="row-name">{t.name}</span>
            <VerdictChip v={v} small />
          </span>
          {showArea && <span className="row-where">{AREAS[t.area]?.label ?? ""} · ~{fmtDrive(driveMin(start, t))}</span>}
          <span className="row-meta">
            <DiffTag d={t.diff} />
            <span>{t.mi} mi · {t.gain.toLocaleString()} ft · ~{fmtHours(bookHours(t))}</span>
            {t.views >= 5 && <span className="tag-view" title="Top-rated views">★ views</span>}
          </span>
        </button>
        <button type="button" className={"row-check" + (p.done ? " on" : "")} aria-pressed={!!p.done}
          aria-label={`${p.done ? "Hiked" : "Mark as hiked"}: ${t.name}`}
          onClick={() => patchLog(t.id, { done: !p.done })}>
          <span className={"box" + (p.done ? " box-on" : "")} aria-hidden="true">{p.done ? "✓" : ""}</span>
        </button>
      </li>
    );
  };

  const wxTime = wx && new Date(wx.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const wxLabel = wxBusy ? "Updating" : wx ? wxTime : wxErr ? "Retry" : "Forecast";

  /* while the sheet is open, the page behind it is out of the tab order and the a11y tree */
  const behindSheet = detailTrail ? ({ inert: "" } as Record<string, string>) : {};

  return (
    <div className="app">
      <header className="appbar" {...behindSheet}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▲</span>
          <h1>CO Trail Atlas</h1>
        </div>
        <div className="appbar-right">
          <span className="tally" aria-label={`${doneCount} of ${TRAILS.length} trails hiked`}>
            <b>{doneCount}</b>/{TRAILS.length} hiked
          </span>
          <button type="button" className="wx-btn" onClick={refreshWeather} disabled={wxBusy}
            aria-label={wxBusy ? "Loading forecast" : wx ? `Forecast from ${wxTime}. Refresh` : "Load today's forecast"}>
            <span className={"wx-ico" + (wxBusy ? " spin" : "")} aria-hidden="true">↻</span> {wxLabel}
          </button>
        </div>
      </header>

      <main className="layout" {...behindSheet}>
        <section className="map-col" ref={mapSecRef} aria-label="Map">
          <AtlasMap ref={mapRef} trails={filtered} allTrails={TRAILS} log={log} verdictFor={verdictFor} selected={sel}
            onSelect={(id) => setSel(id)} onRegion={pickRegion} start={start}>
            {selTrail && !detailTrail && filtered.includes(selTrail) && (
              <div className="preview" role="group" aria-label={`Selected: ${selTrail.name}`}>
                <button type="button" className="preview-main" onClick={() => openDetail(selTrail.id)}>
                  <span className="preview-eyebrow">{AREAS[selTrail.area]?.label} · ~{fmtDrive(driveMin(start, selTrail))} drive</span>
                  <span className="preview-name">{selTrail.name}</span>
                  <span className="preview-meta">
                    <DiffTag d={selTrail.diff} /> {selTrail.mi} mi · {selTrail.gain.toLocaleString()} ft · ~{fmtHours(bookHours(selTrail))}
                    <VerdictChip v={verdictFor(selTrail)} small />
                  </span>
                </button>
                <button type="button" className="preview-x" onClick={() => setSel(null)} aria-label="Dismiss">✕</button>
                <button type="button" className="preview-go" onClick={() => openDetail(selTrail.id)} aria-label={`Open details for ${selTrail.name}`}>
                  Details <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </AtlasMap>
          <div className="map-key" aria-hidden="true">
            {wx ? <>
              <span><i className="k k-good" />good</span><span><i className="k k-fair" />fair</span><span><i className="k k-poor" />poor wx</span>
            </> : <span><i className="k" />trail</span>}
            <span><i className="k k-done" />hiked</span>
            <span><b className="k-star">★</b>{start.label}</span>
            <span className="k-ring">◌ drive hrs</span>
          </div>
          <nav className="regions" aria-label="Explore by region">
            {REGIONS.map((r) => (
              <button key={r.key} type="button" className={"region-chip" + (filters.region === r.key ? " on" : "")}
                aria-pressed={filters.region === r.key} onClick={() => pickRegion(r.key)} disabled={!regionCounts[r.key] && filters.region !== r.key}>
                {r.label} <span className="region-n">{regionCounts[r.key]}</span>
              </button>
            ))}
          </nav>
        </section>

        <section className="list-col" aria-label="Trails">
          <div className="controls">
            <div className="search">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" /></svg>
              <input type="search" value={filters.q} onChange={(e) => setF("q", e.target.value)}
                placeholder="Search trails, towns, trailheads" aria-label="Search trails" enterKeyHint="search" />
              {filters.q && <button type="button" className="search-x" onClick={() => setF("q", "")} aria-label="Clear search">✕</button>}
            </div>
            <div className="chips" role="toolbar" aria-label="Filters">
              <ChipSelect label="Starting point" value={start.key === "gps" ? "gps" : start.key} options={startOptions}
                onChange={(k) => {
                  if (k === "gps") { locateMe(); return; }
                  const s = START_PRESETS.find((p) => p.key === k);
                  if (s) chooseStart(s);
                }}>
                {locBusy ? "Locating…" : <>From <b>{start.label}</b></>}
              </ChipSelect>
              <ChipSelect<DiffBucket | "any"> label="Difficulty" value={filters.diff} active={filters.diff !== "any"}
                options={[{ key: "any", label: "Any difficulty" }, ...DIFF_BUCKETS.map((d) => ({ key: d, label: d }))]}
                onChange={(v) => setF("diff", v)} />
              <ChipSelect<TimeBucket> label="Time on trail" value={filters.time} active={filters.time !== "any"}
                options={TIME_OPTS} onChange={(v) => setF("time", v)} />
              <ToggleChip on={filters.seasonOnly} onClick={() => setF("seasonOnly", !filters.seasonOnly)}>In season ({MONTH_LBL[month - 1]})</ToggleChip>
              <ToggleChip on={filters.notDone} onClick={() => setF("notDone", !filters.notDone)}>Not hiked yet</ToggleChip>
              {wx && <ToggleChip on={filters.goodWx} onClick={() => setF("goodWx", !filters.goodWx)}>Good weather</ToggleChip>}
              <ChipSelect<SortKey> label="Sort" value={sort} options={SORT_OPTS} onChange={setSort}>
                Sort: <b>{SORT_OPTS.find((o) => o.key === sort)?.label}</b>
              </ChipSelect>
            </div>
          </div>

          <div className="results-hd" aria-live="polite">
            <span>
              <b>{sorted.length}</b> {sorted.length === 1 ? "trail" : "trails"}
              {filters.region && <> in {REGIONS.find((r) => r.key === filters.region)?.label}</>}
              {sort === "near" ? <> · nearest to {start.label}</> : <> · {SORT_OPTS.find((o) => o.key === sort)?.label.toLowerCase()} first</>}
            </span>
            {nFilters > 0 && <button type="button" className="clear-btn" onClick={clearFilters}>Clear {nFilters > 1 ? `${nFilters} filters` : "filter"}</button>}
          </div>
          {(locErr || wxErr) && <p className="notice" role="status">{locErr || wxErr}</p>}

          {sorted.length === 0 ? (
            <div className="empty">
              <p>No trails match{filters.q ? <> “{filters.q}”</> : null} with these filters.</p>
              <button type="button" className="clear-btn" onClick={clearFilters}>Show all {TRAILS.length} trails</button>
            </div>
          ) : groups ? (
            groups.map((g) => {
              const all = TRAILS.filter((t) => t.area === g.key);
              const complete = all.every((t) => log[t.id]?.done);
              return (
                <section key={g.key} className="group" aria-label={AREAS[g.key]?.label}>
                  <h2 className="group-hd">
                    <span className="group-name">{AREAS[g.key]?.label ?? g.key}</span>
                    {complete && <span className="group-stamp">★ Area complete</span>}
                    <span className="group-drive">~{fmtDrive(g.min)}</span>
                  </h2>
                  <ul className="rows">{g.trails.map((t) => row(t, false))}</ul>
                </section>
              );
            })
          ) : (
            <ul className="rows rows-flat">{sorted.map((t) => row(t, true))}</ul>
          )}

          <footer className="ft">
            <p>
              A curated set of {TRAILS.length} Colorado classics, not every trail in the state. Drive times are
              straight-line estimates, trail times are book-time estimates, and forecasts are for the trailhead.
              Roads, permits and closures change: check with the land manager and a real forecast before you go.
            </p>
            <p>Your log, ratings and notes stay on this device.</p>
          </footer>
        </section>
      </main>

      {detailTrail && (
        <div className="sheet-scrim" onClick={closeDetail}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="det-name" onClick={(e) => e.stopPropagation()}>
            <TrailDetail
              key={detailTrail.id}
              t={detailTrail}
              area={AREAS[detailTrail.area]}
              start={start}
              w={wx?.byTrail?.[detailTrail.id] ?? null}
              p={log[detailTrail.id] || {}}
              onPatch={(patch) => patchLog(detailTrail.id, patch)}
              onClose={closeDetail}
              onShowOnMap={() => showOnMap(detailTrail)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

