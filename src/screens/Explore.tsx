import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Log, LogEntry, StartPoint, Trail } from "../data/types";
import { AREAS } from "../data/areas";
import { TRAILS } from "../data/trails";
import { COLORADO_LOCATIONS } from "../data/foliage";
import { SITES } from "../data/darksky";
import { SPECIES } from "../data/species";
import { REGIONS } from "../data/geography";
import { driveMin, fmtDrive, haversineMi } from "../lib/geo";
import { MONTH_LBL, currentMonth } from "../lib/season";
import {
  DIFF_BUCKETS, EMPTY_FILTERS, SORT_OPTS, TIME_OPTS, activeFilterCount, bookHours, filterTrails, fmtHours, seasonPicks, sortTrails,
} from "../lib/trails";
import type { DiffBucket, Filters, SortKey, TimeBucket } from "../lib/trails";
import { verdict } from "../lib/weather";
import type { WxPayload } from "../lib/weather";
import { STATUS_META, deriveCondition } from "../lib/foliage/foliage";
import type { Condition } from "../lib/foliage/foliage";
import { PLACES } from "../lib/places";
import type { Place, PlaceKind } from "../lib/places";
import { useAtlas } from "../lib/atlas";
import { discover, fmtMi, sourceList } from "../lib/discover";
import type { DiscoveryResult, FoundTrail, Origin } from "../lib/discover";
import { SOURCE_META } from "../lib/trailSources";
import { AtlasMap } from "../components/AtlasMap";
import type { AtlasMapHandle, MapPoint } from "../components/AtlasMap";
import { DiscoveryMap, RouteGlyph } from "../components/DiscoveryMap";
import { LocationPanel } from "../components/LocationPanel";
import { ChipSelect, DiffTag, ToggleChip, VerdictChip } from "../components/bits";
import { leafReports } from "../components/PlaceDetail";
import { useActions } from "../components/PlaceSections";
import { SpeciesArt, Tag } from "../components/atlasBits";
import { RING_FT, TopoPlate } from "../components/TopoPlate";
import { TitleCard } from "../components/TitleCard";

const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TRAIL_BY_ID = new Map(TRAILS.map((t) => [t.id, t]));
const PAGE = 20;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");
const matches = (q: string, ...hay: (string | null | undefined)[]) => {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const h = norm(hay.filter(Boolean).join(" "));
  return words.every((w) => h.includes(w));
};

type Layer = Exclude<PlaceKind, "found">;
const LAYERS: { key: Layer; label: string; ch: string }[] = [
  { key: "trail", label: "Trails", ch: "I" },
  { key: "color", label: "Fall color", ch: "II" },
  { key: "sky", label: "Dark skies", ch: "III" },
];

type LenBucket = "any" | "short" | "mid" | "long";
const LEN_OPTS: { key: LenBucket; label: string }[] = [
  { key: "any", label: "Any length" },
  { key: "short", label: "Under 3 mi mapped" },
  { key: "mid", label: "3–8 mi mapped" },
  { key: "long", label: "8 mi + mapped" },
];
const inLen = (mi: number, b: LenBucket) => b === "any" || (b === "short" ? mi < 3 : b === "mid" ? mi >= 3 && mi < 8 : mi >= 8);

export type DiscoveryState = { state: "idle" } | { state: "loading" } | { state: "ok"; result: DiscoveryResult } | { state: "error" };

export interface ExploreHandle { showOnMap: (p: { id: string; lat: number; lon: number; name: string }, layer: Layer) => void }

interface Props {
  log: Log;
  patchLog: (id: string, patch: LogEntry) => void;
  origin: Origin | null;
  onOrigin: (o: Origin) => void;
  radiusMi: number;
  onRadius: (mi: number) => void;
  wx: WxPayload | null;
  wxErr: string | null;
  onRetryWx: () => void;
  /** the trail whose sheet is open, if any (keeps it selected on the map) */
  openTrailId: string | null;
  /** reports how many trails the current search found, for the title card */
  onFound?: (n: number | null) => void;
}

export const startOf = (o: Origin | null): StartPoint | null => (o ? { key: o.kind, label: o.label, lat: o.lat, lon: o.lon } : null);

export const Explore = forwardRef<ExploreHandle, Props>(function Explore(
  { log, patchLog, origin, onOrigin, radiusMi, onRadius, wx, wxErr, onRetryWx, openTrailId, onFound }, ref,
) {
  const act = useActions();
  const atlas = useAtlas();
  const start = startOf(origin);
  const [layer, setLayer] = useState<Layer>("trail");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>(origin ? "near" : "views");
  const [sel, setSel] = useState<string | null>(openTrailId);
  const [classics, setClassics] = useState(false);
  const mapRef = useRef<AtlasMapHandle>(null);
  const mapSecRef = useRef<HTMLElement>(null);
  const month = currentMonth();
  if (openTrailId && sel !== openTrailId && layer === "trail") setSel(openTrailId);

  /* ---- live discovery around the chosen origin ---- */
  const [disc, setDisc] = useState<DiscoveryState>({ state: "idle" });
  const [dq, setDq] = useState("");
  const [len, setLen] = useState<LenBucket>("any");
  const [dogs, setDogs] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [dsel, setDsel] = useState<string | null>(null);
  const runId = useRef(0);
  const run = useCallback(() => {
    if (!origin) return;
    const id = ++runId.current;
    setDisc({ state: "loading" }); setShown(PAGE); setDsel(null);
    discover(origin, radiusMi, TRAILS)
      .then((result) => {
        if (id !== runId.current) return;
        const anyOk = Object.values(result.status).some((s) => s.status === "ok");
        setDisc(anyOk || result.atlas.length ? { state: "ok", result } : { state: "error" });
      })
      .catch(() => { if (id === runId.current) setDisc({ state: "error" }); });
  }, [origin?.lat, origin?.lon, radiusMi]);
  useEffect(() => { run(); }, [run]);
  useEffect(() => { if (origin && sort !== "near") setSort("near"); }, [origin?.lat, origin?.lon]);
  useEffect(() => { onFound?.(disc.state === "ok" ? disc.result.trails.length + disc.result.atlas.length : null); }, [disc]);

  const found = disc.state === "ok" ? disc.result : null;
  const dFiltered = useMemo(() => (found?.trails ?? []).filter((t) =>
    inLen(t.mappedMi, len) && (!dogs || /^(yes|leashed|leash|unleashed)/i.test(t.uses.dogs ?? "")) && matches(dq, t.name, t.manager)), [found, len, dogs, dq]);
  const dClassics = useMemo(() => (found?.atlas ?? []).filter((a) => matches(dq, a.trail.name, AREAS[a.trail.area]?.label)), [found, dq]);
  const dFilterCount = [dq.trim() !== "", len !== "any", dogs].filter(Boolean).length;
  const selFound = found?.trails.find((t) => t.id === dsel);

  useImperativeHandle(ref, () => ({
    showOnMap: (p, l) => {
      setLayer(l);
      if (l === "trail") setClassics(true);
      setSel(p.id);
      requestAnimationFrame(() => {
        mapSecRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        mapRef.current?.flyToTrail(p);
      });
    },
  }));

  const verdictFor = useCallback((t: MapPoint) => verdict(wx?.byTrail?.[t.id]), [wx]);
  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  /* ---- the curated atlas classics (the original CO Trail Atlas list) ---- */
  const effective: Filters = {
    ...filters,
    goodWx: filters.goodWx && !!wx,
    regionAreas: filters.region ? REGIONS.find((r) => r.key === filters.region)?.areas : undefined,
  };
  const filtered = useMemo(
    () => filterTrails(TRAILS, effective, { areas: AREAS, log, month, verdictFor }),
    [filters, wx, log, month, verdictFor],
  );
  const sortKey: SortKey = !start && sort === "near" ? "views" : sort;
  const sorted = useMemo(() => sortTrails(filtered, sortKey, start), [filtered, sortKey, start?.lat, start?.lon]);
  const groups = useMemo(() => {
    if (sortKey !== "near") return null;
    const byArea = new Map<string, Trail[]>();
    sorted.forEach((t) => byArea.set(t.area, [...(byArea.get(t.area) || []), t]));
    return [...byArea.entries()]
      .map(([key, trails]) => ({ key, trails, min: driveMin(start, AREAS[key]) }))
      .sort((a, b) => (a.min ?? 0) - (b.min ?? 0));
  }, [sorted, sortKey, start?.lat, start?.lon]);
  const regionCounts = useMemo(() => {
    const noRegion = filterTrails(TRAILS, { ...effective, regionAreas: undefined }, { areas: AREAS, log, month, verdictFor });
    return Object.fromEntries(REGIONS.map((r) => [r.key, noRegion.filter((t) => r.areas.includes(t.area)).length]));
  }, [filters, wx, log, month, verdictFor]);

  /* ---- fall color + dark skies: nearest first when there's a search point ---- */
  const now = useMemo(() => new Date(), []);
  const reports = useMemo(() => leafReports(atlas), [atlas]);
  const conditions = useMemo(() => new Map<string, Condition>(
    COLORADO_LOCATIONS.map((l) => [l.id, deriveCondition(l, reports, now)])), [reports, now]);
  const otherPlaces = useMemo(() => {
    if (layer === "trail") return [];
    const list = PLACES.filter((p) => p.kind === layer && matches(filters.q, p.name, p.sub))
      .map((p) => ({ p, mi: origin ? haversineMi(origin.lat, origin.lon, p.lat, p.lon) : null }));
    return origin ? list.sort((a, b) => (a.mi ?? 0) - (b.mi ?? 0)) : list.sort((a, b) => a.p.name.localeCompare(b.p.name));
  }, [layer, filters.q, origin?.lat, origin?.lon]);

  const picks = useMemo(() => seasonPicks(TRAILS, month, start), [month, start?.lat, start?.lon]);
  const speciesHits = useMemo(() => (filters.q.trim().length >= 3
    ? SPECIES.filter((s) => matches(filters.q, s.common, s.sci)).slice(0, 4) : []), [filters.q]);

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
  const switchLayer = (l: Layer) => {
    if (l === layer) return;
    setLayer(l); setSel(null);
    requestAnimationFrame(() => mapRef.current?.reset());
  };

  const nFilters = activeFilterCount(effective);
  const selTrail = layer === "trail" && sel ? TRAIL_BY_ID.get(sel) : undefined;
  const selPlace = layer !== "trail" && sel ? PLACES.find((p) => p.kind === layer && p.id === sel) : undefined;
  const openTrail = (id: string) => act.openPlace(`trail:${id}`);
  const openFound = (id: string) => act.openFound(id);
  const showClassics = layer === "trail" && (classics || !origin);
  const away = (lat: number, lon: number) => (origin ? `${fmtMi(haversineMi(origin.lat, origin.lon, lat, lon))} away` : null);

  const mapPoints: MapPoint[] = layer === "trail" ? filtered
    : otherPlaces.map(({ p }) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon }));
  const allPoints: MapPoint[] = layer === "trail" ? TRAILS
    : PLACES.filter((p) => p.kind === layer).map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon }));
  const sortOptions = start ? SORT_OPTS : SORT_OPTS.filter((o) => o.key !== "near");

  const row = (t: Trail, showArea: boolean) => {
    const p = log[t.id] || {};
    const v = verdictFor(t);
    return (
      <li key={t.id} className={"row" + (sel === t.id ? " row-sel" : "") + (p.done ? " row-done" : "")}>
        <button type="button" className="row-main" onClick={() => { setSel(t.id); openTrail(t.id); }}>
          <TopoPlate id={t.id} gain={t.gain} className="row-plate" />
          <span className="row-body">
            <span className="row-top">
              <span className="row-name">{t.name}</span>
              <VerdictChip v={v} small />
            </span>
            {showArea && <span className="row-where">{AREAS[t.area]?.label ?? ""}{start ? ` · ${away(t.lat, t.lon)}` : ""}</span>}
            <span className="row-meta">
              <DiffTag d={t.diff} />
              <span>{t.mi} mi · {t.gain.toLocaleString()} ft · ~{fmtHours(bookHours(t))}</span>
              {t.views >= 5 && <span className="tag-view" title="Top-rated views">★ views</span>}
            </span>
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

  const foundRow = (t: FoundTrail) => {
    const curated = t.atlasId ? TRAIL_BY_ID.get(t.atlasId) : undefined;
    const done = curated && log[curated.id]?.done;
    return (
      <li key={t.id} className={"row" + (dsel === t.id ? " row-sel" : "") + (done ? " row-done" : "")}>
        <button type="button" className="row-main" onClick={() => { setDsel(t.id); openFound(t.id); }}>
          <RouteGlyph paths={t.paths} className="row-plate" />
          <span className="row-body">
            <span className="row-top">
              <span className="row-name">{t.name}</span>
              {curated && <span className="chip chip-atlas">In the atlas</span>}
            </span>
            <span className="row-where">{fmtMi(t.nearest.mi)} away{t.manager ? ` · ${t.manager}` : ""}</span>
            <span className="row-meta">
              <span>{t.mappedMi} mi mapped</span>
              {t.elevMaxFt != null && <span>top {t.elevMaxFt.toLocaleString()} ft</span>}
              {t.trailhead && <span>trailhead</span>}
              <span className="row-src">{sourceList(t)}</span>
            </span>
          </span>
        </button>
      </li>
    );
  };

  const placeChip = (p: Place) => {
    if (p.kind === "color") {
      const c = conditions.get(p.id)!;
      return <span className={"chip chip-fol chip-" + c.status}>{STATUS_META[c.status].label} · {c.colorPercent}%</span>;
    }
    const s = SITES.find((x) => x.id === p.id)!;
    return <span className="chip chip-na">{s.designation === "none" ? "Popular spot" : s.designation.replace("Dark Sky ", "")}</span>;
  };

  const statusLine = (r: DiscoveryResult) => {
    const parts = (Object.keys(r.status) as (keyof DiscoveryResult["status"])[]).map((k) => {
      const s = r.status[k];
      const name = SOURCE_META[k].label;
      if (s.status === "skipped") return null;
      if (s.status === "error") return `${name}: didn't answer`;
      return `${name}: ${s.count} segment${s.count === 1 ? "" : "s"}${s.limitedToMi ? ` (nearest ${s.limitedToMi} mi; dense area)` : ""}`;
    }).filter(Boolean);
    return parts.join(" · ");
  };

  return (
    <>
    <TitleCard month={month} date={now} place={origin?.label ?? null}
      counts={{ trails: found ? found.trails.length + found.atlas.length : null, color: COLORADO_LOCATIONS.length, sky: SITES.length }} />
    <div className="explore-top">
      <LocationPanel origin={origin} radiusMi={radiusMi} onOrigin={onOrigin} onRadius={onRadius} searching={disc.state === "loading"} />
      <div className="layers" role="tablist" aria-label="What to show">
        {LAYERS.map((l) => (
          <button key={l.key} type="button" role="tab" aria-selected={layer === l.key}
            className={"layer-tab layer-" + l.key + (layer === l.key ? " on" : "")} onClick={() => switchLayer(l.key)}>
            <span className="layer-ch" aria-hidden="true">{l.ch}</span>{l.label}
          </button>
        ))}
      </div>
    </div>

    {layer === "trail" && origin && !classics && (
      <div className="layout">
        <section className="map-col" aria-label="Trail map">
          {disc.state === "ok" ? (
            <DiscoveryMap origin={origin} radiusMi={radiusMi} trails={dFiltered} selected={dsel}
              classics={dClassics.map((a) => ({ id: a.trail.id, name: a.trail.name, lat: a.trail.lat, lon: a.trail.lon }))}
              onSelect={setDsel} onSelectClassic={(id) => openTrail(id)}>
              {selFound && (
                <div className="preview" role="group" aria-label={`Selected: ${selFound.name}`}>
                  <button type="button" className="preview-main" onClick={() => openFound(selFound.id)}>
                    <span className="preview-eyebrow">{fmtMi(selFound.nearest.mi)} away · straight line</span>
                    <span className="preview-name">{selFound.name}</span>
                    <span className="preview-meta">{selFound.mappedMi} mi mapped{selFound.manager ? ` · ${selFound.manager}` : ""}</span>
                  </button>
                  <button type="button" className="preview-x" onClick={() => setDsel(null)} aria-label="Dismiss">✕</button>
                  <button type="button" className="preview-go" onClick={() => openFound(selFound.id)} aria-label={`Open details for ${selFound.name}`}>
                    Details <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </DiscoveryMap>
          ) : (
            <div className="dm-frame dm-wait" aria-hidden="true">
              <span className="start-star-big">★</span>
            </div>
          )}
          <div className="map-key" aria-hidden="true">
            <span><i className="k k-line" />mapped trail</span>
            <span><i className="k k-th" />trailhead</span>
            <span><i className="k" />atlas classic</span>
            <span className="k-ring">◌ straight-line miles</span>
          </div>
        </section>

        <section className="list-col" aria-label="Trails near you">
          {disc.state === "loading" && (
            <div className="loading-card" role="status">
              <span className="lc-dots" aria-hidden="true"><i /><i /><i /></span>
              <p>Asking Colorado Trail Explorer, the Forest Service and OpenStreetMap for trails within {radiusMi} miles…</p>
            </div>
          )}
          {disc.state === "error" && (
            <div className="empty" role="alert">
              <p className="empty-title">The trail sources didn't answer.</p>
              <p>{typeof navigator !== "undefined" && navigator.onLine === false ? "You're offline. Live trail search needs a connection; saved trails and the atlas classics still work." : "They may be busy. Try again in a moment."}</p>
              <div className="id-actions">
                <button type="button" className="pa-btn pa-primary" onClick={run}>Try again</button>
                <button type="button" className="pa-btn" onClick={() => setClassics(true)}>Browse the atlas classics</button>
              </div>
            </div>
          )}
          {found && <>
            <div className="controls">
              <div className="search">
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" /></svg>
                <input type="search" value={dq} onChange={(e) => { setDq(e.target.value); setShown(PAGE); }} placeholder="Filter these trails by name or manager" aria-label="Filter trails" enterKeyHint="search" />
                {dq && <button type="button" className="search-x" onClick={() => setDq("")} aria-label="Clear filter">✕</button>}
              </div>
              <div className="chips" role="toolbar" aria-label="Filters">
                <ChipSelect<LenBucket> label="Length" value={len} active={len !== "any"} options={LEN_OPTS} onChange={(v) => { setLen(v); setShown(PAGE); }} />
                <ToggleChip on={dogs} onClick={() => { setDogs(!dogs); setShown(PAGE); }}>Dogs allowed</ToggleChip>
              </div>
            </div>
            <div className="results-hd" aria-live="polite">
              <span><b>{dFiltered.length + dClassics.length}</b> {dFiltered.length + dClassics.length === 1 ? "trail" : "trails"} within {radiusMi} mi · nearest first</span>
              {dFilterCount > 0 && <button type="button" className="clear-btn" onClick={() => { setDq(""); setLen("any"); setDogs(false); }}>Clear {dFilterCount > 1 ? `${dFilterCount} filters` : "filter"}</button>}
            </div>
            <p className="layer-note">Distances are straight lines from {origin.label} to the nearest mapped point of each trail. Mapped length adds up every mapped section of a trail; it isn't a loop or a round trip.</p>

            {dFiltered.length + dClassics.length === 0 ? (
              <div className="empty">
                <svg className="empty-art" viewBox="0 0 120 80" aria-hidden="true">
                  <path d="M10,62 C30,48 46,66 64,54 C82,42 96,58 112,48" />
                  <path d="M18,40 C34,30 50,44 66,34 C82,24 94,36 106,30" />
                  <path d="M54,22 l6,-10 l6,10 z" className="empty-summit" />
                </svg>
                {dFilterCount ? <>
                  <p className="empty-title">No trails match these filters.</p>
                  <button type="button" className="clear-btn" onClick={() => { setDq(""); setLen("any"); setDogs(false); }}>Clear filters</button>
                </> : <>
                  <p className="empty-title">No mapped trails within {radiusMi} miles.</p>
                  <p>The sources may not cover this area well yet. Try a wider radius or a town nearby.</p>
                  {radiusMi < 50 && <button type="button" className="pa-btn pa-primary" onClick={() => onRadius(radiusMi < 25 ? 25 : 50)}>Search {radiusMi < 25 ? 25 : 50} miles</button>}
                </>}
              </div>
            ) : <>
              <ul className="rows rows-flat">{dFiltered.slice(0, shown).map(foundRow)}</ul>
              {dFiltered.length > shown && (
                <button type="button" className="more-btn" onClick={() => setShown((n) => n + PAGE)}>
                  Show {Math.min(PAGE, dFiltered.length - shown)} more{dFiltered.length - shown > PAGE ? ` of ${dFiltered.length - shown}` : ""}
                </button>
              )}
              {!!dClassics.length && (
                <section className="group" aria-label="Atlas classics in range">
                  <h2 className="group-hd"><span className="group-name">Atlas classics in range</span></h2>
                  <ul className="rows">{dClassics.map((a) => row(a.trail, true))}</ul>
                </section>
              )}
            </>}
            <footer className="ft">
              <p>Sources, queried live: {statusLine(found)}. {SOURCE_META.osm.license}. Records are merged when the same named trail shows up in more than one source.</p>
              <p>No live conditions or closures. Check with the land manager before you go.</p>
            </footer>
          </>}
          <button type="button" className="more-btn more-quiet" onClick={() => setClassics(true)}>Browse all {TRAILS.length} atlas classics</button>
        </section>
      </div>
    )}

    {(showClassics || layer !== "trail") && (
    <div className="layout">
      <section className="map-col" ref={mapSecRef} aria-label="Map">
        {layer === "trail" && (
          <div className="classics-hd">
            <h2>{origin ? "The atlas classics" : <>Or browse the {TRAILS.length} atlas classics</>}</h2>
            <p>Field-checked Colorado trails with season notes, parking and après picks.</p>
            {origin && <button type="button" className="linkish" onClick={() => setClassics(false)}>Back to trails near {origin.label}</button>}
          </div>
        )}
        <AtlasMap ref={mapRef} key={layer} trails={mapPoints} allTrails={allPoints} log={layer === "trail" ? log : {}}
          verdictFor={layer === "trail" ? verdictFor : () => null} selected={sel}
          onSelect={(id) => setSel(id)} onRegion={pickRegion} start={start}
          shape={layer === "trail" ? "tri" : layer === "color" ? "diamond" : "dot"}
          markClass={layer === "color" ? (t) => "fol-" + (conditions.get(t.id)?.status ?? "early") : undefined}
          noun={layer === "trail" ? "trails" : layer === "color" ? "fall-color spots" : "dark-sky sites"}>
          {selTrail && filtered.includes(selTrail) && openTrailId !== selTrail.id && (
            <div className="preview" role="group" aria-label={`Selected: ${selTrail.name}`}>
              <button type="button" className="preview-main" onClick={() => openTrail(selTrail.id)}>
                <TopoPlate id={selTrail.id} gain={selTrail.gain} className="preview-plate" />
                <span className="preview-eyebrow">{AREAS[selTrail.area]?.label}{start ? ` · ~${fmtDrive(driveMin(start, selTrail))} drive (est.)` : ""}</span>
                <span className="preview-name">{selTrail.name}</span>
                <span className="preview-meta">
                  <DiffTag d={selTrail.diff} /> {selTrail.mi} mi · {selTrail.gain.toLocaleString()} ft · ~{fmtHours(bookHours(selTrail))}
                  <VerdictChip v={verdictFor(selTrail)} small />
                </span>
              </button>
              <button type="button" className="preview-x" onClick={() => setSel(null)} aria-label="Dismiss">✕</button>
              <button type="button" className="preview-go" onClick={() => openTrail(selTrail.id)} aria-label={`Open details for ${selTrail.name}`}>
                Details <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
          {selPlace && (
            <div className="preview" role="group" aria-label={`Selected: ${selPlace.name}`}>
              <button type="button" className="preview-main" onClick={() => act.openPlace(selPlace.ref)}>
                <span className="preview-eyebrow">{selPlace.sub}{origin ? ` · ${away(selPlace.lat, selPlace.lon)}` : ""}</span>
                <span className="preview-name">{selPlace.name}</span>
                <span className="preview-meta">{placeChip(selPlace)}</span>
              </button>
              <button type="button" className="preview-x" onClick={() => setSel(null)} aria-label="Dismiss">✕</button>
              <button type="button" className="preview-go" onClick={() => act.openPlace(selPlace.ref)} aria-label={`Open details for ${selPlace.name}`}>
                Details <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </AtlasMap>
        <div className="map-key" aria-hidden="true">
          {layer === "trail" && (wx ? <>
            <span><i className="k k-good" />good</span><span><i className="k k-fair" />fair</span><span><i className="k k-poor" />poor wx</span>
          </> : <span><i className="k" />trail</span>)}
          {layer === "trail" && <span><i className="k k-done" />hiked</span>}
          {layer === "color" && <>
            {(["early", "turning", "peak", "past"] as const).map((s) => <span key={s}><i className={"kf kf-" + s} />{STATUS_META[s].label.toLowerCase()}</span>)}
            <span>estimates</span>
          </>}
          {layer === "sky" && <span><i className="ks" />dark-sky site</span>}
          {start && <><span><b className="k-star">★</b>{start.label}</span><span className="k-ring">◌ drive hrs (estimate)</span></>}
        </div>
        {layer === "trail" && (
          <nav className="regions" aria-label="Explore by region">
            {REGIONS.map((r) => (
              <button key={r.key} type="button" className={"region-chip" + (filters.region === r.key ? " on" : "")}
                aria-pressed={filters.region === r.key} onClick={() => pickRegion(r.key)} disabled={!regionCounts[r.key] && filters.region !== r.key}>
                {r.label} <span className="region-n">{regionCounts[r.key]}</span>
              </button>
            ))}
          </nav>
        )}
      </section>

      <section className="list-col" aria-label={layer === "trail" ? "Atlas classics" : layer === "color" ? "Fall color spots" : "Dark-sky sites"}>
        <div className="controls">
          <div className="search">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" /></svg>
            <input type="search" value={filters.q} onChange={(e) => setF("q", e.target.value)}
              placeholder={layer === "trail" ? "Search the classics, towns, plants" : layer === "color" ? "Search spots, towns, plants" : "Search sites, regions, plants"}
              aria-label={layer === "trail" ? "Search the atlas classics" : "Search places"} enterKeyHint="search" />
            {filters.q && <button type="button" className="search-x" onClick={() => setF("q", "")} aria-label="Clear search">✕</button>}
          </div>
          {layer === "trail" && (
            <div className="chips" role="toolbar" aria-label="Filters">
              <ChipSelect<DiffBucket | "any"> label="Difficulty" value={filters.diff} active={filters.diff !== "any"}
                options={[{ key: "any", label: "Any difficulty" }, ...DIFF_BUCKETS.map((d) => ({ key: d, label: d }))]}
                onChange={(v) => setF("diff", v)} />
              <ChipSelect<TimeBucket> label="Time on trail" value={filters.time} active={filters.time !== "any"}
                options={TIME_OPTS} onChange={(v) => setF("time", v)} />
              <ToggleChip on={filters.seasonOnly} onClick={() => setF("seasonOnly", !filters.seasonOnly)}>In season ({MONTH_LBL[month - 1]})</ToggleChip>
              <ToggleChip on={filters.notDone} onClick={() => setF("notDone", !filters.notDone)}>Not hiked yet</ToggleChip>
              {wx && <ToggleChip on={filters.goodWx} onClick={() => setF("goodWx", !filters.goodWx)}>Good weather</ToggleChip>}
              <ChipSelect<SortKey> label="Sort" value={sortKey} options={sortOptions} onChange={setSort}>
                Sort: <b>{SORT_OPTS.find((o) => o.key === sortKey)?.label}</b>
              </ChipSelect>
            </div>
          )}
        </div>

        {!!speciesHits.length && (
          <div className="guide-hits" aria-label="In the field guide">
            <div className="guide-hits-hd">In the field guide</div>
            {speciesHits.map((s) => (
              <button key={s.id} type="button" className="guide-hit" onClick={() => act.openSpecies(s.id)}>
                <SpeciesArt s={s} className="gh-art" />
                <span><b>{s.common}</b><i>{s.sci}</i></span>
              </button>
            ))}
          </div>
        )}

        {layer === "trail" ? <>
          <div className="results-hd" aria-live="polite">
            <span>
              <b>{sorted.length}</b> {sorted.length === 1 ? "classic" : "classics"}
              {filters.region && <> in {REGIONS.find((r) => r.key === filters.region)?.label}</>}
              {sortKey === "near" && start ? <> · nearest to {start.label}</> : <> · {SORT_OPTS.find((o) => o.key === sortKey)?.label.toLowerCase()} first</>}
            </span>
            {nFilters > 0 && <button type="button" className="clear-btn" onClick={clearFilters}>Clear {nFilters > 1 ? `${nFilters} filters` : "filter"}</button>}
          </div>
          {wxErr && (
            <div className="notice notice-row" role="status">
              <span>{wxErr}</span>
              <button type="button" className="clear-btn" onClick={onRetryWx}>Retry forecast</button>
            </div>
          )}

          {nFilters === 0 && picks.length > 0 && (
            <section className="shelf" aria-labelledby="shelf-hd">
              <div className="shelf-head">
                <h3 id="shelf-hd">In season this {MONTH_NAME[month - 1]} <Tag p="reference" /></h3>
                <p>Best months from the atlas notes, best views first. Each ring is about {RING_FT} ft of climbing.</p>
              </div>
              <ul className="shelf-track">
                {picks.map((t, i) => (
                  <li key={t.id} className="pick-item" style={{ ["--i" as string]: i }}>
                    <button type="button" className="pick" onClick={() => { setSel(t.id); openTrail(t.id); }}>
                      <span className="pick-plate"><TopoPlate id={t.id} gain={t.gain} summit /></span>
                      <span className="pick-where">{AREAS[t.area]?.label}{start ? ` · ${away(t.lat, t.lon)}` : ""}</span>
                      <span className="pick-name">{t.name}</span>
                      <span className="pick-meta"><DiffTag d={t.diff} /><span>{t.mi} mi · {t.gain.toLocaleString()} ft</span></span>
                      <span className="pick-season">{t.prime}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sorted.length === 0 ? (
            <div className="empty">
              <svg className="empty-art" viewBox="0 0 120 80" aria-hidden="true">
                <path d="M10,62 C30,48 46,66 64,54 C82,42 96,58 112,48" />
                <path d="M18,40 C34,30 50,44 66,34 C82,24 94,36 106,30" />
                <path d="M54,22 l6,-10 l6,10 z" className="empty-summit" />
              </svg>
              <p className="empty-title">No classics match{filters.q ? <> “{filters.q}”</> : null} with these filters.</p>
              <p>This part of the sheet is blank. Loosen a filter, or start over.</p>
              <button type="button" className="clear-btn" onClick={clearFilters}>Show all {TRAILS.length} classics</button>
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
        </> : <>
          <div className="results-hd" aria-live="polite">
            <span><b>{otherPlaces.length}</b> {layer === "color" ? "fall-color spots" : "dark-sky sites"}{origin ? <> · nearest to {origin.label}</> : " · A to Z"}</span>
            {filters.q && <button type="button" className="clear-btn" onClick={() => setF("q", "")}>Clear search</button>}
          </div>
          {layer === "color" && (
            <p className="layer-note">Color is Leaf Hunter's estimate from each spot's typical peak, replaced by your own leaf checks when you log them. Season runs roughly September into October.</p>
          )}
          {layer === "sky" && (
            <p className="layer-note">Certified places from DarkSky International plus popular Front Range spots, carried over from LOOKUP. Each page works out tonight's darkness and Moon.</p>
          )}
          {otherPlaces.length === 0 ? (
            <div className="empty"><p>Nothing matches “{filters.q}”.</p></div>
          ) : (
            <ul className="rows rows-flat">
              {otherPlaces.map(({ p, mi }) => (
                <li key={p.ref} className={"row" + (sel === p.id ? " row-sel" : "")}>
                  <button type="button" className="row-main" onClick={() => { setSel(p.id); act.openPlace(p.ref); }}>
                    <span className="row-top"><span className="row-name">{p.name}</span>{placeChip(p)}</span>
                    <span className="row-where">{p.sub}{mi != null ? ` · ${fmtMi(mi)} away` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>}

        <footer className="ft">
          <p>
            {layer === "trail" ? <>{TRAILS.length} curated Colorado classics, field-checked by hand. For every mapped trail around you, search a place or use your location above. </> : null}
            Distances are straight lines; drive times are estimates, trail times are book-time estimates, and forecasts are for the trailhead.
            Roads, permits and closures change: check with the land manager and a real forecast before you go.
          </p>
          <p>Your log, finds and photos stay on this device.</p>
        </footer>
      </section>
    </div>
    )}
    </>
  );
});
