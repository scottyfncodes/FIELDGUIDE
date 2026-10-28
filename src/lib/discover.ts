import type { Trail } from "../data/types";
import { haversineMi } from "./geo";
import { SOURCE_META, USFS_TRAIL_CLASS, fetchCotrex, fetchOsm, fetchUsfs } from "./trailSources";
import type { LatLon, Segment, SourceKey, SourceResult, Trailhead } from "./trailSources";

/* ---------- DISCOVERY: segments in, trails out ----------
   Sources map trails as many short segments. This turns them into one card
   per trail, honestly:
     1. group a source's segments by name + manager, then split each group
        into pieces that actually connect (two "Mesa Trail"s 40 miles apart
        stay two trails);
     2. dedupe across sources: same normalized name AND geometry within a
        quarter mile is one trail. The richer source leads (COTREX, then
        USFS, then OSM); every source id is kept;
     3. attach a COTREX trailhead when one sits on the trail;
     4. rank by straight-line distance from the search point to the trail's
        nearest mapped point, and drop anything outside the radius.
   Nothing is filled in: a field a source didn't give stays null. */

export interface SourceRef { source: SourceKey; id: string }

export interface FoundTrail {
  id: string;
  name: string;
  manager: string | null;
  sources: SourceRef[];
  /** lead source: the one whose geometry and length are shown */
  primary: Exclude<SourceKey, "atlas">;
  paths: LatLon[][];
  /** total mapped length of every piece of this trail, miles (not a round trip) */
  mappedMi: number;
  elevMinFt: number | null;
  elevMaxFt: number | null;
  surface: string | null;
  uses: { hike: string | null; bike: string | null; horse: string | null; dogs: string | null };
  access: string | null;
  trailClass: string | null;
  grade: string | null;
  accessibility: string | null;
  hikerSeason: string | null;
  sacScale: string | null;
  trailNo: string | null;
  updated: number | null;
  trailhead: Trailhead | null;
  /** nearest mapped point to the search point, and how far (straight line) */
  nearest: { lat: number; lon: number; mi: number };
  /** a curated atlas trail this matches, by id */
  atlasId: string | null;
}

export interface Origin { lat: number; lon: number; label: string; kind: "gps" | "place"; acc?: number }

export interface DiscoveryResult {
  origin: Origin;
  radiusMi: number;
  trails: FoundTrail[];
  /** curated atlas trails in range that no source matched */
  atlas: { trail: Trail; mi: number }[];
  status: Record<Exclude<SourceKey, "atlas">, { status: SourceResult<unknown>["status"] | "pending"; count: number; limitedToMi?: number }>;
  at: number;
  /** the raw source answers, kept with a cached result so it can be re-ranked for a nearby point */
  _raw?: { cot: Awaited<ReturnType<typeof fetchCotrex>>; usfs: SourceResult<Segment>; osm: SourceResult<Segment> };
}

/* ---- names ---- */
export function nameKey(name: string): string {
  return name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(national recreation trail|nrt)\b/g, "")
    .replace(/#\s*\d+[a-z]?|\bno\.?\s*\d+[a-z]?\b|\(\s*\d+[a-z]?\s*\)/g, "")
    .replace(/\b(trail|trails|tr|trl|path)\b/g, "")
    .replace(/\bmount\b/g, "mt").replace(/\bsaint\b/g, "st").replace(/\bcreek\b/g, "cr")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

/* ---- geometry ---- */
export const pathMi = (p: LatLon[]) => p.reduce((s, pt, i) => (i ? s + haversineMi(p[i - 1][0], p[i - 1][1], pt[0], pt[1]) : 0), 0);

/** Every nth vertex (and the ends): enough for proximity tests without O(n²) blowups. */
function sample(paths: LatLon[][], max = 60): LatLon[] {
  const all = paths.flat();
  if (all.length <= max) return all;
  const step = all.length / max;
  const out: LatLon[] = [];
  for (let i = 0; i < all.length; i += step) out.push(all[Math.floor(i)]);
  out.push(all[all.length - 1]);
  return out;
}

export function nearestPoint(paths: LatLon[][], lat: number, lon: number): { lat: number; lon: number; mi: number } {
  let best = { lat: NaN, lon: NaN, mi: Infinity };
  for (const p of paths) for (const [a, b] of p) {
    const d = haversineMi(lat, lon, a, b);
    if (d < best.mi) best = { lat: a, lon: b, mi: d };
  }
  return best;
}

function minDistance(a: LatLon[], b: LatLon[]): number {
  let m = Infinity;
  for (const p of a) for (const q of b) {
    const d = haversineMi(p[0], p[1], q[0], q[1]);
    if (d < m) m = d;
    if (m < 0.01) return m;
  }
  return m;
}

const ends = (s: Segment): LatLon[] => s.paths.flatMap((p) => [p[0], p[p.length - 1]]);

/** Splits one name group into connected pieces: segments join when an end is within `joinMi` of the other's geometry. */
export function connectedPieces(segs: Segment[], joinMi = 0.25): Segment[][] {
  const parent = segs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const samples = segs.map((s) => sample(s.paths, 30));
  const endPts = segs.map(ends);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (find(i) === find(j)) continue;
      if (minDistance(endPts[i], samples[j]) <= joinMi || minDistance(endPts[j], samples[i]) <= joinMi) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, Segment[]>();
  segs.forEach((s, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), s]));
  return [...groups.values()];
}

const M_TO_FT = 3.28084;
const first = <T,>(xs: (T | null | undefined)[]) => xs.find((x) => x != null && x !== "") ?? null;
const mode = (xs: (string | null | undefined)[]) => {
  const c = new Map<string, number>();
  xs.forEach((x) => { if (x) c.set(x, (c.get(x) ?? 0) + 1); });
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }

/** One source's connected piece of one named trail → a card. */
export function buildTrail(piece: Segment[], origin: { lat: number; lon: number }): FoundTrail {
  const s0 = piece[0];
  const paths = piece.flatMap((s) => s.paths);
  const mappedMi = piece.reduce((sum, s) => sum + (s.lengthMi && s.lengthMi > 0 ? s.lengthMi : s.paths.reduce((t, p) => t + pathMi(p), 0)), 0);
  const mins = piece.map((s) => s.elevMinM).filter((v): v is number => v != null && v > 0);
  const maxs = piece.map((s) => s.elevMaxM).filter((v): v is number => v != null && v > 0);
  const ids = [...new Set(piece.map((s) => s.sourceId))].sort();
  const nearest = nearestPoint(paths, origin.lat, origin.lon);
  return {
    id: `${s0.source}:${slug(s0.name)}:${ids[0]}`,
    name: s0.name,
    manager: mode(piece.map((s) => s.manager)),
    sources: ids.map((id) => ({ source: s0.source, id })),
    primary: s0.source,
    paths,
    mappedMi: Math.round(mappedMi * 10) / 10,
    elevMinFt: mins.length ? Math.round(Math.min(...mins) * M_TO_FT) : null,
    elevMaxFt: maxs.length ? Math.round(Math.max(...maxs) * M_TO_FT) : null,
    surface: mode(piece.map((s) => s.surface)),
    uses: {
      hike: mode(piece.map((s) => s.hiking)), bike: mode(piece.map((s) => s.bike)),
      horse: mode(piece.map((s) => s.horse)), dogs: mode(piece.map((s) => s.dogs)),
    },
    access: mode(piece.map((s) => s.access)),
    trailClass: mode(piece.map((s) => s.trailClass)),
    grade: mode(piece.map((s) => s.grade)),
    accessibility: mode(piece.map((s) => s.accessibility)),
    hikerSeason: mode(piece.map((s) => s.hikerSeason)),
    sacScale: mode(piece.map((s) => s.sacScale)),
    trailNo: first(piece.map((s) => s.trailNo)),
    updated: piece.reduce<number | null>((m, s) => (s.updated && (!m || s.updated > m) ? s.updated : m), null),
    trailhead: null,
    nearest,
    atlasId: null,
  };
}

export function trailsFromSegments(segs: Segment[], origin: { lat: number; lon: number }): FoundTrail[] {
  const groups = new Map<string, Segment[]>();
  for (const s of segs) {
    const k = `${s.source}|${nameKey(s.name)}|${(s.manager ?? "").toLowerCase()}`;
    if (!nameKey(s.name)) continue;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return [...groups.values()].flatMap((g) => connectedPieces(g).map((piece) => buildTrail(piece, origin)));
}

const RANK: Record<Exclude<SourceKey, "atlas">, number> = { cotrex: 0, usfs: 1, osm: 2 };

/** Merges `b` into `a` (a leads): fill a's gaps, keep every source id. */
function absorb(a: FoundTrail, b: FoundTrail): FoundTrail {
  const keep = <K extends keyof FoundTrail>(k: K) => (a[k] ?? b[k]) as FoundTrail[K];
  return {
    ...a,
    sources: [...a.sources, ...b.sources.filter((s) => !a.sources.some((x) => x.source === s.source && x.id === s.id))],
    manager: keep("manager"), surface: keep("surface"), access: keep("access"),
    trailClass: keep("trailClass"), grade: keep("grade"), accessibility: keep("accessibility"),
    hikerSeason: keep("hikerSeason"), sacScale: keep("sacScale"), trailNo: keep("trailNo"),
    elevMinFt: keep("elevMinFt"), elevMaxFt: keep("elevMaxFt"),
    uses: {
      hike: a.uses.hike ?? b.uses.hike, bike: a.uses.bike ?? b.uses.bike,
      horse: a.uses.horse ?? b.uses.horse, dogs: a.uses.dogs ?? b.uses.dogs,
    },
    updated: a.updated ?? b.updated,
  };
}

export const SAME_TRAIL_MI = 0.25;

/** Cross-source dedupe: same name key and geometry within a quarter mile. */
export function dedupeTrails(trails: FoundTrail[]): FoundTrail[] {
  const sorted = trails.slice().sort((x, y) => RANK[x.primary] - RANK[y.primary] || y.mappedMi - x.mappedMi);
  const kept: { t: FoundTrail; key: string; pts: LatLon[] }[] = [];
  for (const t of sorted) {
    const key = nameKey(t.name);
    const pts = sample(t.paths);
    const twin = kept.find((k) => k.key === key && k.t.primary !== t.primary && minDistance(k.pts, pts) <= SAME_TRAIL_MI);
    if (twin) twin.t = absorb(twin.t, t);
    else kept.push({ t, key, pts });
  }
  return kept.map((k) => k.t);
}

/** A COTREX trailhead on (within 0.15 mi of) the trail; the one nearest the search point wins. */
export function attachTrailheads(trails: FoundTrail[], ths: Trailhead[], origin: { lat: number; lon: number }): FoundTrail[] {
  if (!ths.length) return trails;
  return trails.map((t) => {
    const pts = t.paths.flat();
    const on = ths.filter((h) => pts.some(([a, b]) => Math.abs(a - h.lat) < 0.003 && haversineMi(a, b, h.lat, h.lon) <= 0.15));
    if (!on.length) return t;
    on.sort((x, y) => haversineMi(origin.lat, origin.lon, x.lat, x.lon) - haversineMi(origin.lat, origin.lon, y.lat, y.lon));
    return { ...t, trailhead: on[0] };
  });
}

/** Curated atlas names are "Place: Trail" or "Trail Loop"; match on the trail part, near the curated trailhead. */
export function matchAtlas(found: FoundTrail[], atlas: Trail[]): { trails: FoundTrail[]; unmatched: Trail[] } {
  const used = new Set<string>();
  const trails = found.map((f) => {
    const fk = nameKey(f.name);
    const hit = atlas.find((a) => {
      if (used.has(a.id)) return false;
      const ak = nameKey(a.name.split(":").pop()!.replace(/\b(loop|out and back)\b/gi, ""));
      return !!ak && (fk === ak || (fk.length > 5 && ak.length > 5 && (fk.includes(ak) || ak.includes(fk)))) &&
        nearestPoint(f.paths, a.lat, a.lon).mi <= 1;
    });
    if (!hit) return f;
    used.add(hit.id);
    return { ...f, atlasId: hit.id, sources: [{ source: "atlas" as const, id: hit.id }, ...f.sources] };
  });
  return { trails, unmatched: atlas.filter((a) => !used.has(a.id)) };
}

/* ---- the search ---- */
type Fetch = typeof fetch;
const memo = new Map<string, DiscoveryResult>();
const byId = new Map<string, FoundTrail>();

/* a tiny change signal, so a sheet opened from a shared link fills in when the search lands */
let version = 0;
const listeners = new Set<() => void>();
export const foundVersion = () => version;
export function subscribeFound(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
const bump = () => { version++; listeners.forEach((l) => l()); };

export const foundById = (id: string) => byId.get(id);
export const RADIUS_PRESETS = [5, 10, 25, 50] as const;

/* What leaves the phone: the search point rounded to 0.01° (about 1 km), with
   the box widened a mile to make up for it. Exact distances are worked out here. */
export const roundForQuery = (v: number) => Math.round(v * 100) / 100;
const QUERY_PAD_MI = 1;

/** A source that hangs shouldn't hold the others hostage. */
export function withDeadline<T extends { status: string; items: unknown[] }>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}
export const SOURCE_DEADLINE_MS = { arcgis: 45_000, osm: 35_000 };

function assemble(
  origin: Origin, radiusMi: number, atlas: Trail[],
  cot: Awaited<ReturnType<typeof fetchCotrex>>, usfs: SourceResult<Segment>, osm: SourceResult<Segment> | null,
): DiscoveryResult {
  const built = trailsFromSegments([...cot.items, ...usfs.items, ...(osm?.items ?? [])], origin);
  const merged = attachTrailheads(dedupeTrails(built), cot.trailheads, origin)
    .filter((t) => t.nearest.mi <= radiusMi && t.mappedMi >= 0.05);
  const inRange = atlas.map((trail) => ({ trail, mi: haversineMi(origin.lat, origin.lon, trail.lat, trail.lon) })).filter((a) => a.mi <= radiusMi);
  const { trails, unmatched } = matchAtlas(merged, inRange.map((a) => a.trail));
  trails.sort((a, b) => a.nearest.mi - b.nearest.mi || a.name.localeCompare(b.name));
  trails.forEach((t) => byId.set(t.id, t));
  bump();
  /* a source limited to a smaller box can't speak for the whole radius */
  const lim = (n?: number) => (n != null ? Math.max(0, n - QUERY_PAD_MI) : undefined);
  return {
    origin, radiusMi, trails,
    atlas: inRange.filter((a) => unmatched.includes(a.trail)).sort((a, b) => a.mi - b.mi),
    status: {
      cotrex: { status: cot.status, count: cot.items.length, limitedToMi: lim(cot.limitedToMi) },
      usfs: { status: usfs.status, count: usfs.items.length, limitedToMi: lim(usfs.limitedToMi) },
      osm: osm ? { status: osm.status, count: osm.items.length, limitedToMi: lim(osm.limitedToMi) } : { status: "pending", count: 0 },
    },
    at: Date.now(),
  };
}

/**
 * Trails around `origin`. COTREX and the Forest Service usually answer in a
 * second or two; Overpass can take much longer, so `onPartial` gets a first
 * result without OpenStreetMap, and the promise resolves with everything.
 */
export async function discover(
  origin: Origin, radiusMi: number, atlas: Trail[], fetchImpl: Fetch = fetch,
  onPartial?: (r: DiscoveryResult) => void,
): Promise<DiscoveryResult> {
  const key = `${roundForQuery(origin.lat)},${roundForQuery(origin.lon)},${radiusMi}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 30 * 60_000) {
    /* same rounded area: re-rank against this exact point */
    return assemble(origin, radiusMi, atlas, hit._raw!.cot, hit._raw!.usfs, hit._raw!.osm);
  }
  const qLat = roundForQuery(origin.lat), qLon = roundForQuery(origin.lon), qR = radiusMi + QUERY_PAD_MI;
  const timedOut = { status: "error" as const, items: [] };
  const fastP = Promise.all([
    withDeadline(fetchCotrex(qLat, qLon, qR, fetchImpl), SOURCE_DEADLINE_MS.arcgis, { ...timedOut, trailheads: [] }),
    withDeadline(fetchUsfs(qLat, qLon, qR, fetchImpl), SOURCE_DEADLINE_MS.arcgis, timedOut),
  ]);
  const osmP = withDeadline(fetchOsm(qLat, qLon, qR, fetchImpl), SOURCE_DEADLINE_MS.osm, timedOut);
  let osmDone: SourceResult<Segment> | null = null;
  osmP.then((o) => { osmDone = o; });
  const [cot, usfs] = await fastP;
  if (onPartial && !osmDone) onPartial(assemble(origin, radiusMi, atlas, cot, usfs, null));
  const osm = await osmP;
  const result = assemble(origin, radiusMi, atlas, cot, usfs, osm);
  if (Object.values(result.status).some((s) => s.status === "ok")) memo.set(key, { ...result, _raw: { cot, usfs, osm } });
  return result;
}

export function _clearDiscovery() { memo.clear(); byId.clear(); bump(); }

/* ---- presentation helpers: what each value is, in words ---- */
export const fmtMi = (mi: number) => (mi < 0.1 ? "< 0.1 mi" : mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`);

export function difficultyText(t: Pick<FoundTrail, "trailClass" | "sacScale">): string | null {
  if (t.trailClass && USFS_TRAIL_CLASS[t.trailClass]) return USFS_TRAIL_CLASS[t.trailClass];
  const sac: Record<string, string> = {
    hiking: "SAC T1: hiking", mountain_hiking: "SAC T2: mountain hiking", demanding_mountain_hiking: "SAC T3: demanding mountain hiking",
    alpine_hiking: "SAC T4: alpine hiking", demanding_alpine_hiking: "SAC T5: demanding alpine hiking", difficult_alpine_hiking: "SAC T6: difficult alpine hiking",
  };
  return t.sacScale ? sac[t.sacScale] ?? `SAC scale: ${t.sacScale.replace(/_/g, " ")}` : null;
}

/** USFS "06/01-10/31" → "Jun 1 to Oct 31". */
export function seasonText(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})$/);
  if (!m) return s;
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = (mm: string, dd: string) => `${mon[Number(mm) - 1] ?? mm} ${Number(dd)}`;
  if (m[1] === "01" && m[2] === "01" && m[3] === "12" && m[4] === "31") return "year-round";
  return `${d(m[1], m[2])} to ${d(m[3], m[4])}`;
}

/** USFS "TG05 - +12-20%" → "12–20%". */
export const gradeText = (g: string | null) => (g ? g.replace(/^TG\d+\s*-\s*/i, "").replace(/^\+/, "").replace(/(\d)-(\d)/, "$1–$2") : null);

export const sourceList = (t: FoundTrail) => [...new Set(t.sources.map((s) => SOURCE_META[s.source].label))].join(" + ");

/** The longest single mapped line, for the elevation profile and climb estimate. */
export function longestPath(paths: LatLon[][]): LatLon[] {
  return paths.reduce((best, p) => (pathMi(p) > pathMi(best) ? p : best), paths[0] ?? []);
}

/** Up to n evenly spaced points along a line, by distance. */
export function resample(path: LatLon[], n: number): LatLon[] {
  if (path.length < 2 || n < 2) return path.slice();
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + haversineMi(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]));
  const total = cum[cum.length - 1];
  if (total === 0) return [path[0]];
  const out: LatLon[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1);
    while (j < path.length - 1 && cum[j] < d) j++;
    const seg = cum[j] - cum[j - 1] || 1;
    const f = Math.min(1, Math.max(0, (d - cum[j - 1]) / seg));
    out.push([path[j - 1][0] + (path[j][0] - path[j - 1][0]) * f, path[j - 1][1] + (path[j][1] - path[j - 1][1]) * f]);
  }
  return out;
}

/** Climb along a line from sampled elevations (meters): total up, total down, in feet. Ignores sub-3 m wiggle. */
export function climbFt(elevM: number[]): { up: number; down: number } {
  let up = 0, down = 0, ref = elevM[0];
  for (const e of elevM.slice(1)) {
    const d = e - ref;
    if (Math.abs(d) >= 3) { if (d > 0) up += d; else down -= d; ref = e; }
  }
  return { up: Math.round(up * M_TO_FT), down: Math.round(down * M_TO_FT) };
}

/** Open-Meteo's elevation API (Copernicus 90 m DEM): free, keyless, up to 100 points a call. */
export async function fetchElevations(pts: LatLon[], fetchImpl: Fetch = fetch): Promise<number[] | null> {
  if (!pts.length) return null;
  try {
    const lat = pts.map((p) => p[0].toFixed(5)).join(","), lon = pts.map((p) => p[1].toFixed(5)).join(",");
    const res = await fetchImpl(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    if (!res.ok) return null;
    const j = await res.json();
    const e = Array.isArray(j?.elevation) ? j.elevation.map(Number) : null;
    return e && e.length === pts.length && e.every(Number.isFinite) ? e : null;
  } catch {
    return null;
  }
}
