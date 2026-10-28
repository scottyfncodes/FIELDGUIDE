import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { foundById, foundVersion, subscribeFound, climbFt, difficultyText, fetchElevations, fmtMi, gradeText, longestPath, pathMi, resample, seasonText } from "../lib/discover";
import type { FoundTrail, Origin } from "../lib/discover";
import { SOURCE_META } from "../lib/trailSources";
import type { SourceKey } from "../lib/trailSources";
import { activeOuting, endOuting, foundSnapshot, isSaved, keepFound, startOuting, toggleSavedFound, useAtlas } from "../lib/atlas";
import type { FoundSnapshot } from "../lib/atlas";
import { placeByRef } from "../lib/places";
import { directionsUrl, haversineMi } from "../lib/geo";
import { bookHours, fmtHours } from "../lib/trails";
import { TRAILS } from "../data/trails";
import { NearbyNature, YourFinds, useActions } from "./PlaceSections";
import { NearbyWildlife } from "./Wildlife";
import { Tag, fmtDuration } from "./atlasBits";

/* ---------- A TRAIL FROM THE LIVE SEARCH ----------
   Everything on this sheet is either what a source said (tagged with that
   source), computed here from the geometry (tagged computed), or an
   estimate (tagged estimate). What no source gave is shown as unknown. */

type Attr = "surface" | "hike" | "bike" | "horse" | "dogs" | "access" | "trailClass" | "trailClassLabel" | "useText" | "grade" | "accessibility" | "hikerSeason" | "sacScale" | "trailNo";

export interface FoundView {
  id: string;
  name: string;
  manager: string | null;
  sources: { source: string; id: string }[];
  paths: [number, number][][];
  mappedMi: number;
  elevMinFt: number | null;
  elevMaxFt: number | null;
  attrs: Partial<Record<Attr, string>>;
  trailhead: { name: string; lat: number; lon: number; fee?: string | null; water?: string | null; bathrooms?: string | null } | null;
  updated: number | null;
  atlasId: string | null;
  /** an older saved copy rather than today's search */
  saved: boolean;
}

export function viewOf(t: FoundTrail): FoundView {
  const attrs: Partial<Record<Attr, string>> = {};
  const put = (k: Attr, v: string | null) => { if (v) attrs[k] = v; };
  put("surface", t.surface); put("hike", t.uses.hike); put("bike", t.uses.bike); put("horse", t.uses.horse); put("dogs", t.uses.dogs);
  put("access", t.access); put("trailClass", t.trailClass); put("trailClassLabel", t.trailClassLabel); put("useText", t.useText); put("grade", t.grade); put("accessibility", t.accessibility);
  put("hikerSeason", t.hikerSeason); put("sacScale", t.sacScale); put("trailNo", t.trailNo);
  return {
    id: t.id, name: t.name, manager: t.manager, sources: t.sources, paths: t.paths, mappedMi: t.mappedMi,
    elevMinFt: t.elevMinFt, elevMaxFt: t.elevMaxFt, attrs, trailhead: t.trailhead, updated: t.updated, atlasId: t.atlasId, saved: false,
  };
}

export function viewOfSnapshot(s: FoundSnapshot): FoundView {
  return {
    id: s.id, name: s.name, manager: s.manager, sources: s.sources, paths: s.paths, mappedMi: s.mappedMi,
    elevMinFt: s.elevMinFt, elevMaxFt: s.elevMaxFt, attrs: s.attrs as FoundView["attrs"], trailhead: s.trailhead, updated: s.updated,
    atlasId: s.sources.find((x) => x.source === "atlas")?.id ?? null, saved: true,
  };
}

/** Where the trail "is", for directions, finds and wildlife: its trailhead, else its middle vertex. */
export function anchorOf(v: Pick<FoundView, "trailhead" | "paths">): { lat: number; lon: number } {
  if (v.trailhead) return { lat: v.trailhead.lat, lon: v.trailhead.lon };
  const all = v.paths.flat();
  const mid = all[Math.floor(all.length / 2)] ?? [0, 0];
  return { lat: mid[0], lon: mid[1] };
}

/** A compact copy to keep on the device: geometry thinned to a few hundred points. */
export function snapshotOf(v: FoundView, sub: string): Omit<FoundSnapshot, "keptAt"> {
  const total = v.paths.reduce((n, p) => n + p.length, 0);
  const keepEvery = Math.max(1, Math.ceil(total / 400));
  const paths = v.paths.map((p) => p.filter((_, i) => i % keepEvery === 0 || i === p.length - 1)).filter((p) => p.length >= 2);
  const a = anchorOf(v);
  return {
    id: v.id, name: v.name, manager: v.manager, lat: a.lat, lon: a.lon, sub, mappedMi: v.mappedMi,
    elevMinFt: v.elevMinFt, elevMaxFt: v.elevMaxFt, paths,
    sources: v.atlasId && !v.sources.some((s) => s.source === "atlas") ? [{ source: "atlas", id: v.atlasId }, ...v.sources] : v.sources,
    trailhead: v.trailhead ? { name: v.trailhead.name, lat: v.trailhead.lat, lon: v.trailhead.lon } : null,
    updated: v.updated, attrs: v.attrs as Record<string, string>,
  };
}

/* The trail's own map: its mapped lines, trailhead, and a scale bar, on a quad-sheet plate. */
export function RoutePlate({ v }: { v: Pick<FoundView, "paths" | "trailhead"> }) {
  const W = 320, H = 200, PAD = 18;
  const g = useMemo(() => {
    const pts = v.paths.flat();
    if (!pts.length) return null;
    const lat0 = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const c = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p[1] * c * 69), ys = pts.map((p) => -p[0] * 69);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const k = Math.min((W - PAD * 2) / Math.max(0.05, maxX - minX), (H - PAD * 2) / Math.max(0.05, maxY - minY));
    const ox = (W - (maxX - minX) * k) / 2, oy = (H - (maxY - minY) * k) / 2;
    const x = (lon: number) => ox + (lon * c * 69 - minX) * k, y = (lat: number) => oy + (-lat * 69 - minY) * k;
    const bar = [0.1, 0.25, 0.5, 1, 2, 5].find((m) => m * k >= W / 6) ?? 5;
    return { x, y, k, bar };
  }, [v.paths]);
  if (!g) return null;
  const d = v.paths.map((p) => p.map(([la, lo], i) => `${i ? "L" : "M"}${g.x(lo).toFixed(1)},${g.y(la).toFixed(1)}`).join("")).join("");
  return (
    <svg className="route-plate" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of the trail's mapped route">
      <rect x="1" y="1" width={W - 2} height={H - 2} className="rp-paper" />
      <rect x="6" y="6" width={W - 12} height={H - 12} className="rp-inner" />
      <path d={d} className="rp-line-under" />
      <path d={d} className="rp-line" />
      {v.trailhead && (
        <g transform={`translate(${g.x(v.trailhead.lon)} ${g.y(v.trailhead.lat)})`}>
          <rect x="-5" y="-5" width="10" height="10" className="rp-th" />
          <text x="9" y="4" className="rp-lbl">TRAILHEAD</text>
        </g>
      )}
      <g transform={`translate(14 ${H - 16})`}>
        <path d={`M0,0 L${g.bar * g.k},0 M0,-4 L0,0 M${g.bar * g.k},-4 L${g.bar * g.k},0`} className="dm-bar" />
        <text x="0" y="-7" className="rp-lbl">{g.bar} MI</text>
      </g>
      <text x={W - 14} y="22" textAnchor="end" className="rp-lbl">N ↑</text>
    </svg>
  );
}

const yesNo = (v: string | undefined) => (v ? v.replace(/_/g, " ") : null);

export function FoundTrailDetail({ id, origin, onClose }: { id: string; origin: Origin | null; onClose: () => void }) {
  const act = useActions();
  const d = useAtlas();
  const closeRef = useRef<HTMLButtonElement>(null);
  useSyncExternalStore(subscribeFound, foundVersion, foundVersion); // re-render when a search lands
  const live = foundById(id);
  const snap = foundSnapshot(d, id);
  const v = live ? viewOf(live) : snap ? viewOfSnapshot(snap) : null;
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [id]);

  const [climb, setClimb] = useState<{ state: "loading" } | { state: "ok"; up: number; down: number; mi: number } | { state: "failed" }>({ state: "loading" });
  useEffect(() => {
    if (!v) return;
    let alive = true;
    const line = longestPath(v.paths);
    const mi = pathMi(line);
    setClimb({ state: "loading" });
    fetchElevations(resample(line, Math.min(100, Math.max(8, Math.round(mi * 12))))).then((e) => {
      if (!alive) return;
      setClimb(e ? { state: "ok", ...climbFt(e), mi } : { state: "failed" });
    });
    return () => { alive = false; };
  }, [id, !!v]);

  if (!v) {
    return (
      <article className="det" aria-label="Trail not loaded">
        <div className="det-bar">
          <button ref={closeRef} type="button" className="det-close" onClick={onClose} aria-label="Close"><span aria-hidden="true">←</span> Back</button>
        </div>
        <div className="empty">
          <p className="empty-title">This trail came from a live search that isn't loaded anymore.</p>
          <p>Search the same area again in Explore to see it, or save trails you want to keep.</p>
        </div>
      </article>
    );
  }

  const anchor = anchorOf(v);
  const ref = `found:${v.id}` as const;
  const kept = placeByRef(ref);
  const sub = origin ? `${fmtMi(haversineMi(origin.lat, origin.lon, anchor.lat, anchor.lon))} straight-line from ${origin.label}. Driving is longer; your map app has the route.` : "";
  const snapshot = () => snapshotOf(v, v.manager ?? "");
  const saved = isSaved(d, ref);
  const out = activeOuting(d);
  const here = out?.placeRef === ref;
  const curated = v.atlasId ? TRAILS.find((t) => t.id === v.atlasId) : undefined;
  const diff = difficultyText({ trailClass: v.attrs.trailClass ?? null, trailClassLabel: v.attrs.trailClassLabel ?? null, sacScale: v.attrs.sacScale ?? null });
  const srcKeys = [...new Set(v.sources.map((s) => s.source))] as SourceKey[];
  const leadTag = <Tag p="reference">{srcKeys.filter((k) => k !== "atlas").map((k) => SOURCE_META[k]?.label ?? k).join(" + ")}</Tag>;
  const hours = climb.state === "ok" ? bookHours({ mi: climb.mi, gain: climb.up }) : null;
  const distFromOrigin = origin ? haversineMi(origin.lat, origin.lon, anchor.lat, anchor.lon) : null;

  const groundRows: [string, string | null][] = [
    ["Surface", yesNo(v.attrs.surface)],
    ["Hiking", yesNo(v.attrs.hike)],
    ["Managed for", v.attrs.useText ?? null],
    ["Dogs", yesNo(v.attrs.dogs)],
    ["Bikes", yesNo(v.attrs.bike)],
    ["Horses", yesNo(v.attrs.horse)],
    ["Access", yesNo(v.attrs.access)],
    ["Accessibility", v.attrs.accessibility ? v.attrs.accessibility.toLowerCase() : null],
    ["Typical grade", gradeText(v.attrs.grade ?? null)],
    ["Managed for hikers", seasonText(v.attrs.hikerSeason ?? null)],
    ["Trail number", v.attrs.trailNo ?? null],
  ];
  const shown = groundRows.filter(([, val]) => val);

  return (
    <article className="det" aria-labelledby="det-name">
      <div className="det-bar">
        <button ref={closeRef} type="button" className="det-close" onClick={onClose} aria-label="Close trail details">
          <span aria-hidden="true">←</span> Back
        </button>
        <div className="det-bar-actions">
          <button type="button" className="det-act" aria-pressed={saved} onClick={() => { toggleSavedFound(snapshot()); act.toast(saved ? "Removed from your journal" : "Saved to your journal"); }}>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <header className="det-head found-head">
        <div className="det-head-text">
          <div className="det-eyebrow">TRAIL{v.manager ? ` · ${v.manager.toUpperCase()}` : ""}</div>
          <h2 id="det-name" className="det-name">{v.name}</h2>
          <div className="det-th">{sub || " "}</div>
        </div>
      </header>
      <RoutePlate v={v} />
      {v.saved && !live && <p className="quiet small">Your saved copy. Search this area again for the latest details.</p>}

      <dl className="stats">
        <div><dt>Mapped</dt><dd>{v.mappedMi ? `${v.mappedMi} mi` : "Unknown"}<small>all sections, not a loop</small></dd></div>
        <div><dt>Elevation</dt><dd>{v.elevMinFt != null && v.elevMaxFt != null ? `${v.elevMinFt.toLocaleString()}–${v.elevMaxFt.toLocaleString()} ft` : "Unknown"}<small>{v.elevMinFt != null ? "low to high point" : "not in the source"}</small></dd></div>
        <div><dt>Climb</dt><dd>{climb.state === "ok" ? `~${climb.up.toLocaleString()} ft` : climb.state === "loading" ? "…" : "Unknown"}<small>{climb.state === "ok" ? `up, one way along ${fmtMi(climb.mi)}` : climb.state === "failed" ? "terrain data unavailable" : "computing"}</small></dd></div>
        <div><dt>Time</dt><dd>{hours != null ? `~${fmtHours(hours)}` : "Unknown"}<small>{hours != null ? "book-time estimate, one way" : " "}</small></dd></div>
      </dl>
      <p className="quiet small stats-note">
        Mapped length and elevation come from {srcKeys.filter((k) => k !== "atlas").map((k) => SOURCE_META[k]?.label ?? k).join(" and ")}. Climb is <Tag p="computed" /> from a 90 m terrain model
        (Open-Meteo, Copernicus DEM) along the longest mapped section. Time is an <Tag p="estimate" /> by book time: 30 min a mile plus 30 min per 1,000 ft.
      </p>

      <section className="det-sec">
        <h3>Difficulty {diff && leadTag}</h3>
        <p>{diff ?? "Not rated by these sources. Judge it by the climb, the length and the terrain."}</p>
        {v.attrs.trailClass && <p className="quiet small">Trail class (the federal agencies' shared scale) describes how built-up the tread is, not how hard the hike is.</p>}
      </section>

      <section className="det-sec">
        <h3>On the ground {!!shown.length && leadTag}</h3>
        {shown.length ? (
          <div className="kv">{shown.map(([k, val]) => <div key={k}><span>{k}</span><b>{val}</b></div>)}</div>
        ) : <p className="quiet">No surface, use or access details in the source data.</p>}
        <p className="quiet small">No live conditions or closures here. Check with {v.manager ?? "the land manager"} before you go.</p>
      </section>

      {curated && (
        <section className="det-sec">
          <h3>In the atlas <Tag p="reference" /></h3>
          <p>Field-checked as <button type="button" className="linkish" onClick={() => act.openPlace(`trail:${curated.id}`)}>{curated.name}</button>, with season notes, the trailhead, parking and après picks.</p>
        </section>
      )}

      <div className="place-actions">
        <button type="button" className={"pa-btn" + (saved ? " on" : "")} aria-pressed={saved} onClick={() => toggleSavedFound(snapshot())}>{saved ? "Saved" : "Save trail"}</button>
        {here ? (
          <button type="button" className="pa-btn pa-end" onClick={() => { endOuting(out!.id); act.onOutingEnded(ref, false); }}>
            End outing <small>{fmtDuration(out!.startedAt, null)}</small>
          </button>
        ) : (
          <button type="button" className="pa-btn" onClick={() => { startOuting(keepFound(snapshot())); act.toast(`Outing started at ${v.name}`); }}>
            {out ? "Start outing here" : "I'm here: start outing"}
          </button>
        )}
        <button type="button" className="pa-btn pa-primary" onClick={() => act.identifyAt(keepFound(snapshot()))}>Log a find here</button>
      </div>

      {kept && <YourFinds place={kept} />}
      <NearbyWildlife lat={anchor.lat} lon={anchor.lon} />
      <NearbyNature place={kept ?? { ref, kind: "found", id: v.id, name: v.name, sub: "", lat: anchor.lat, lon: anchor.lon }} />

      <section className="det-sec sources">
        <h3>Sources</h3>
        <ul className="src-list">
          {srcKeys.map((k) => {
            const m = SOURCE_META[k];
            const ids = v.sources.filter((s) => s.source === k).map((s) => s.id);
            return (
              <li key={k}>
                <b>{m?.long ?? k}</b>
                <span className="quiet small">
                  {k === "atlas" ? "Curated entry" : `${ids.length} record${ids.length === 1 ? "" : "s"}: ${ids.slice(0, 3).join(", ")}${ids.length > 3 ? "…" : ""}`}
                  {m?.license ? ` · ${m.license}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="quiet small">{v.updated ? `Last edited in the source ${new Date(v.updated).toLocaleDateString("en-US", { month: "short", year: "numeric" })}.` : "The source doesn't give an edit date."} Queried live; nothing here is a guide's own survey.</p>
      </section>

      <div className="det-cta">
        <div className="det-drive">
          {distFromOrigin != null ? <><b>{fmtMi(distFromOrigin)} away</b> in a straight line</> : <span>Directions open in your map app</span>}
        </div>
        <a className="dir-btn" href={directionsUrl(anchor.lat, anchor.lon)} target="_blank" rel="noreferrer">
          {v.trailhead ? `Directions to ${v.trailhead.name}` : "Directions to the trail"}
        </a>
      </div>
      {!v.trailhead && <p className="quiet small">No mapped trailhead: directions go to a point on the trail, which may not have road access or parking.</p>}
      {v.trailhead && (v.trailhead.fee || v.trailhead.water || v.trailhead.bathrooms) && (
        <p className="quiet small">Trailhead (COTREX): {[v.trailhead.fee && `fee ${v.trailhead.fee}`, v.trailhead.water && `water ${v.trailhead.water}`, v.trailhead.bathrooms && `restrooms ${v.trailhead.bathrooms}`].filter(Boolean).join(" · ")}.</p>
      )}
    </article>
  );
}
