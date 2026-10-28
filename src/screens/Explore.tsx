import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Log, LogEntry, StartPoint, Trail } from "../data/types";
import { AREAS } from "../data/areas";
import { TRAILS } from "../data/trails";
import { COLORADO_LOCATIONS } from "../data/foliage";
import { SITES } from "../data/darksky";
import { SPECIES } from "../data/species";
import { REGIONS, START_PRESETS } from "../data/geography";
import { driveMin, fmtDrive } from "../lib/geo";
import { MONTH_LBL, currentMonth } from "../lib/season";
import {
  DIFF_BUCKETS, EMPTY_FILTERS, SORT_OPTS, TIME_OPTS, activeFilterCount, bookHours, filterTrails, fmtHours, sortTrails,
} from "../lib/trails";
import type { DiffBucket, Filters, SortKey, TimeBucket } from "../lib/trails";
import { verdict } from "../lib/weather";
import type { WxPayload } from "../lib/weather";
import { STATUS_META, deriveCondition } from "../lib/foliage/foliage";
import type { Condition } from "../lib/foliage/foliage";
import { PLACES } from "../lib/places";
import type { Place, PlaceKind } from "../lib/places";
import { useAtlas } from "../lib/atlas";
import { AtlasMap } from "../components/AtlasMap";
import type { AtlasMapHandle, MapPoint } from "../components/AtlasMap";
import { ChipSelect, DiffTag, ToggleChip, VerdictChip } from "../components/bits";
import { leafReports } from "../components/PlaceDetail";
import { useActions } from "../components/PlaceSections";
import { SpeciesArt } from "../components/atlasBits";

const TRAIL_BY_ID = new Map(TRAILS.map((t) => [t.id, t]));
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");
const matches = (q: string, ...hay: (string | undefined)[]) => {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const h = norm(hay.filter(Boolean).join(" "));
  return words.every((w) => h.includes(w));
};

type Layer = PlaceKind;
const LAYERS: { key: Layer; label: string; n: number }[] = [
  { key: "trail", label: "Trails", n: TRAILS.length },
  { key: "color", label: "Fall color", n: COLORADO_LOCATIONS.length },
  { key: "sky", label: "Dark skies", n: SITES.length },
];

export interface ExploreHandle { showOnMap: (p: { id: string; lat: number; lon: number; name: string }, layer: Layer) => void }

interface Props {
  log: Log;
  patchLog: (id: string, patch: LogEntry) => void;
  start: StartPoint;
  chooseStart: (s: StartPoint) => void;
  locateMe: () => void;
  locBusy: boolean;
  locErr: string | null;
  wx: WxPayload | null;
  wxErr: string | null;
  /** the trail whose sheet is open, if any (keeps it selected on the map) */
  openTrailId: string | null;
}

export const Explore = forwardRef<ExploreHandle, Props>(function Explore(
  { log, patchLog, start, chooseStart, locateMe, locBusy, locErr, wx, wxErr, openTrailId }, ref,
) {
  const act = useActions();
  const atlas = useAtlas();
  const [layer, setLayer] = useState<Layer>("trail");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("near");
  const [sel, setSel] = useState<string | null>(openTrailId);
  const mapRef = useRef<AtlasMapHandle>(null);
  const mapSecRef = useRef<HTMLElement>(null);
  const month = currentMonth();
  if (openTrailId && sel !== openTrailId && layer === "trail") setSel(openTrailId);

  useImperativeHandle(ref, () => ({
    showOnMap: (p, l) => {
      setLayer(l);
      setSel(p.id);
      requestAnimationFrame(() => {
        mapSecRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        mapRef.current?.flyToTrail(p);
      });
    },
  }));

  const verdictFor = useCallback((t: MapPoint) => verdict(wx?.byTrail?.[t.id]), [wx]);
  const setF = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  /* ---- trails: the original discovery, unchanged ---- */
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
  const regionCounts = useMemo(() => {
    const noRegion = filterTrails(TRAILS, { ...effective, regionAreas: undefined }, { areas: AREAS, log, month, verdictFor });
    return Object.fromEntries(REGIONS.map((r) => [r.key, noRegion.filter((t) => r.areas.includes(t.area)).length]));
  }, [filters, wx, log, month, verdictFor]);

  /* ---- fall color + dark skies: search, nearest first ---- */
  const now = useMemo(() => new Date(), []);
  const reports = useMemo(() => leafReports(atlas), [atlas]);
  const conditions = useMemo(() => new Map<string, Condition>(
    COLORADO_LOCATIONS.map((l) => [l.id, deriveCondition(l, reports, now)])), [reports, now]);
  const otherPlaces = useMemo(() => {
    if (layer === "trail") return [];
    return PLACES.filter((p) => p.kind === layer && matches(filters.q, p.name, p.sub))
      .map((p) => ({ p, min: driveMin(start, p) ?? 0 }))
      .sort((a, b) => a.min - b.min);
  }, [layer, filters.q, start]);

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

  const startOptions = [
    ...START_PRESETS.map((p) => ({ key: p.key, label: p.label })),
    { key: "gps", label: start.key === "gps" ? "My location (update)" : "Use my location" },
  ];

  const mapPoints: MapPoint[] = layer === "trail" ? filtered
    : otherPlaces.map(({ p }) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon }));
  const allPoints: MapPoint[] = layer === "trail" ? TRAILS
    : PLACES.filter((p) => p.kind === layer).map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon }));

  const row = (t: Trail, showArea: boolean) => {
    const p = log[t.id] || {};
    const v = verdictFor(t);
    return (
      <li key={t.id} className={"row" + (sel === t.id ? " row-sel" : "") + (p.done ? " row-done" : "")}>
        <button type="button" className="row-main" onClick={() => { setSel(t.id); openTrail(t.id); }}>
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

  const placeChip = (p: Place) => {
    if (p.kind === "color") {
      const c = conditions.get(p.id)!;
      return <span className={"chip chip-fol chip-" + c.status}>{STATUS_META[c.status].label} · {c.colorPercent}%</span>;
    }
    const s = SITES.find((x) => x.id === p.id)!;
    return <span className="chip chip-na">{s.designation === "none" ? "Popular spot" : s.designation.replace("Dark Sky ", "")}</span>;
  };

  return (
    <div className="layout">
      <section className="map-col" ref={mapSecRef} aria-label="Map">
        <AtlasMap ref={mapRef} key={layer} trails={mapPoints} allTrails={allPoints} log={layer === "trail" ? log : {}}
          verdictFor={layer === "trail" ? verdictFor : () => null} selected={sel}
          onSelect={(id) => setSel(id)} onRegion={pickRegion} start={start}
          shape={layer === "trail" ? "tri" : layer === "color" ? "diamond" : "dot"}
          markClass={layer === "color" ? (t) => "fol-" + (conditions.get(t.id)?.status ?? "early") : undefined}
          noun={layer === "trail" ? "trails" : layer === "color" ? "fall-color spots" : "dark-sky sites"}>
          {selTrail && filtered.includes(selTrail) && openTrailId !== selTrail.id && (
            <div className="preview" role="group" aria-label={`Selected: ${selTrail.name}`}>
              <button type="button" className="preview-main" onClick={() => openTrail(selTrail.id)}>
                <span className="preview-eyebrow">{AREAS[selTrail.area]?.label} · ~{fmtDrive(driveMin(start, selTrail))} drive</span>
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
                <span className="preview-eyebrow">{selPlace.sub} · ~{fmtDrive(driveMin(start, selPlace))} drive</span>
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
          <span><b className="k-star">★</b>{start.label}</span>
          <span className="k-ring">◌ drive hrs</span>
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

      <section className="list-col" aria-label={layer === "trail" ? "Trails" : layer === "color" ? "Fall color spots" : "Dark-sky sites"}>
        <div className="controls">
          <div className="layers" role="tablist" aria-label="What to show">
            {LAYERS.map((l) => (
              <button key={l.key} type="button" role="tab" aria-selected={layer === l.key}
                className={"layer-tab" + (layer === l.key ? " on" : "")} onClick={() => switchLayer(l.key)}>
                {l.label} <span className="region-n">{l.n}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" /></svg>
            <input type="search" value={filters.q} onChange={(e) => setF("q", e.target.value)}
              placeholder={layer === "trail" ? "Search trails, towns, plants" : layer === "color" ? "Search spots, towns, plants" : "Search sites, regions, plants"}
              aria-label={layer === "trail" ? "Search trails" : "Search places"} enterKeyHint="search" />
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
            {layer === "trail" && <>
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
            </>}
          </div>
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
        </> : <>
          <div className="results-hd" aria-live="polite">
            <span><b>{otherPlaces.length}</b> {layer === "color" ? "fall-color spots" : "dark-sky sites"} · nearest to {start.label}</span>
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
              {otherPlaces.map(({ p, min }) => (
                <li key={p.ref} className={"row" + (sel === p.id ? " row-sel" : "")}>
                  <button type="button" className="row-main" onClick={() => { setSel(p.id); act.openPlace(p.ref); }}>
                    <span className="row-top"><span className="row-name">{p.name}</span>{placeChip(p)}</span>
                    <span className="row-where">{p.sub} · ~{fmtDrive(min)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>}

        <footer className="ft">
          <p>
            A curated set of {TRAILS.length} Colorado classics, {COLORADO_LOCATIONS.length} fall-color spots and {SITES.length} dark-sky
            sites, not every place in the state. Drive times are straight-line estimates, trail times are book-time estimates, and
            forecasts are for the trailhead. Roads, permits and closures change: check with the land manager and a real forecast before you go.
          </p>
          <p>Your log, finds and photos stay on this device.</p>
        </footer>
      </section>
    </div>
  );
});
