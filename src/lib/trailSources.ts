/* ---------- LIVE TRAIL SOURCES ----------
   Three public datasets, queried by bounding box around wherever the person
   is searching. Nothing is bundled or mirrored; every record keeps its source
   id. All three are keyless and answer browsers directly (CORS). The two
   ArcGIS layers were checked live while building this; Overpass refuses
   datacenter clients, so it was written to its documented JSON format.

   COTREX       Colorado Trail Explorer, Colorado Parks and Wildlife's statewide
                trail map (~40,000 mi from 230+ land managers), served by the
                state OIT GIS server. Layer 40 trails, layer 29 trailheads.
                Segments carry name, manager, surface, uses, dogs, length and
                the lowest/highest elevation (meters). Colorado only.
   USFS         Forest Service National Forest System trails (EDW), every
                national forest in the US. Trail class, grade, surface,
                accessibility and the season it's managed for hikers.
   NPS          National Park Service public trails, every park unit. Trail
                class, surface, allowed use, park name, edit date.
   BLM          Bureau of Land Management trails managed for public use (GTLF),
                the West's public land outside parks and forests (Moab, the
                desert Southwest). Surface, mode of travel, mileage.
   OSM          OpenStreetMap via the Overpass API: named footpaths anywhere in
                North America. Fills gaps (city parks, Canada, Mexico). ODbL.
   NPS and BLM were added after a phone search around Moab found nothing:
   no COTREX outside Colorado, no national forest within 10 mi. Both were
   checked live (CORS allowed, paging supported). */

export type SourceKey = "atlas" | "cotrex" | "nps" | "usfs" | "blm" | "osm";
export type LatLon = [number, number];

export interface Bbox { south: number; west: number; north: number; east: number }

/** One mapped piece of trail as a source returns it. A named trail is usually many. */
export interface Segment {
  source: Exclude<SourceKey, "atlas">;
  sourceId: string;
  name: string;
  manager: string | null;
  /** [lat, lon] polylines */
  paths: LatLon[][];
  /** source's own length for this piece, miles; null = measure the geometry */
  lengthMi: number | null;
  elevMinM?: number | null;
  elevMaxM?: number | null;
  surface?: string | null;
  hiking?: string | null;
  bike?: string | null;
  horse?: string | null;
  dogs?: string | null;
  access?: string | null;
  trailClass?: string | null;
  grade?: string | null;
  accessibility?: string | null;
  hikerSeason?: string | null;
  trailNo?: string | null;
  sacScale?: string | null;
  wheelchair?: string | null;
  /** the source's own trail-class wording (NPS: "Class 2: Minor Development") */
  trailClassLabel?: string | null;
  /** who the trail is managed for, in the source's words (NPS "Hiker/Pedestrian", BLM "Non-Motorized") */
  useText?: string | null;
  /** ms since epoch, when the source says */
  updated?: number | null;
}

export interface Trailhead {
  source: "cotrex";
  sourceId: string;
  name: string;
  lat: number;
  lon: number;
  manager: string | null;
  fee: string | null;
  water: string | null;
  bathrooms: string | null;
}

export const SOURCE_META: Record<SourceKey, { label: string; long: string; license: string; url: string }> = {
  atlas: { label: "Atlas", long: "CO Field Atlas, field-checked", license: "", url: "" },
  cotrex: {
    label: "COTREX", long: "Colorado Trail Explorer (Colorado Parks and Wildlife)",
    license: "Public data from Colorado Parks and Wildlife and partner land managers", url: "https://trails.colorado.gov",
  },
  usfs: {
    label: "USFS", long: "U.S. Forest Service, National Forest System trails",
    license: "U.S. government public data", url: "https://data.fs.usda.gov/geodata/edw/datasets.php",
  },
  nps: {
    label: "NPS", long: "National Park Service, public trails",
    license: "U.S. government public data", url: "https://public-nps.opendata.arcgis.com",
  },
  blm: {
    label: "BLM", long: "Bureau of Land Management, trails managed for public use (GTLF)",
    license: "U.S. government public data", url: "https://catalog.data.gov/dataset/blm-natl-gtlf-public-managed-trails",
  },
  osm: {
    label: "OpenStreetMap", long: "OpenStreetMap contributors via the Overpass API",
    license: "© OpenStreetMap contributors, ODbL", url: "https://www.openstreetmap.org/copyright",
  },
};

export const COTREX_URL = "https://gis.colorado.gov/public/rest/services/OIT/Colorado_State_Basemap/MapServer";
export const USFS_URL = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0";
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const NPS_URL = "https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/FeatureServer/0";
export const BLM_URL = "https://gis.blm.gov/arcgis/rest/services/transportation/BLM_Natl_GTLF_Public_Display/MapServer/7";

/** Colorado's lat/lon box: COTREX has nothing outside it. */
export const COLORADO: Bbox = { south: 36.99, west: -109.06, north: 41.01, east: -102.04 };
export const intersects = (a: Bbox, b: Bbox) => a.south < b.north && b.south < a.north && a.west < b.east && b.west < a.east;

export function bboxAround(lat: number, lon: number, radiusMi: number): Bbox {
  const dLat = radiusMi / 69;
  const dLon = radiusMi / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { south: lat - dLat, west: lon - dLon, north: lat + dLat, east: lon + dLon };
}

type Fetch = typeof fetch;

async function getJson(url: string, fetchImpl: Fetch, init?: RequestInit, ms = 20_000): Promise<any> {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), ms);
  try {
    const res = await fetchImpl(url, { ...init, signal: ctl?.signal });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const j = await res.json();
    if (j && typeof j === "object" && "error" in j && j.error && typeof j.error === "object") throw new Error("arcgis " + (j.error.code ?? "error"));
    return j;
  } finally {
    clearTimeout(timer);
  }
}

/* ---- ArcGIS REST: envelope queries, counted first, then paged ---- */
const PAGE = 1000;
/* checked live: a 50 mi search around Denver holds about 9,100 COTREX segments,
   so the cap trades payload (simplified geometry, ~1 MB per 1,000) against reach */
export const MAX_PER_SOURCE = 6000;

function envelope(b: Bbox) {
  return `geometry=${[b.west, b.south, b.east, b.north].map((n) => n.toFixed(5)).join(",")}` +
    "&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects";
}

export async function arcgisCount(layerUrl: string, where: string, b: Bbox, fetchImpl: Fetch): Promise<number> {
  const j = await getJson(`${layerUrl}/query?where=${encodeURIComponent(where)}&${envelope(b)}&returnCountOnly=true&f=json`, fetchImpl);
  return Number(j?.count) || 0;
}

/** Pages through a layer with resultOffset until the server stops saying there's more. */
export async function arcgisQuery(
  layerUrl: string, where: string, fields: string[], b: Bbox, fetchImpl: Fetch,
  opts: { orderBy: string; simplifyDeg?: number; geometry?: boolean; max?: number } = { orderBy: "OBJECTID" },
): Promise<any[]> {
  const out: any[] = [];
  const max = opts.max ?? MAX_PER_SOURCE;
  for (let offset = 0; offset < max; offset += PAGE) {
    const url = `${layerUrl}/query?where=${encodeURIComponent(where)}&${envelope(b)}` +
      `&outFields=${fields.join(",")}&returnGeometry=${opts.geometry === false ? "false" : "true"}&outSR=4326&geometryPrecision=5` +
      (opts.simplifyDeg ? `&maxAllowableOffset=${opts.simplifyDeg}` : "") +
      `&orderByFields=${opts.orderBy}&resultOffset=${offset}&resultRecordCount=${PAGE}&f=json`;
    const j = await getJson(url, fetchImpl);
    const feats = Array.isArray(j?.features) ? j.features : [];
    out.push(...feats);
    if (!j?.exceededTransferLimit || feats.length === 0) break;
  }
  return out;
}

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return typeof v === "number" ? String(v) : null;
  const t = v.trim();
  return t && t !== " " && t.toLowerCase() !== "null" ? t : null;
};
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** ArcGIS polyline paths come as [x=lon, y=lat]; flip to [lat, lon]. */
export function esriPaths(g: any): LatLon[][] {
  const paths = Array.isArray(g?.paths) ? g.paths : [];
  return paths
    .map((p: any) => (Array.isArray(p) ? p : []).filter((pt: any) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
      .map((pt: number[]): LatLon => [pt[1], pt[0]]))
    .filter((p: LatLon[]) => p.length >= 2);
}

/* ---- COTREX ---- */
export const COTREX_WHERE = "name IS NOT NULL AND name <> ' ' AND (type IS NULL OR type <> 'Road') AND (hiking IS NULL OR hiking <> 'no')";
const COTREX_FIELDS = ["OBJECTID", "feature_id", "name", "manager", "surface", "type", "hiking", "horse", "bike", "dogs", "access", "min_elevat", "max_elevat", "length_mi_", "trail_num", "EDIT_DATE"];

export function parseCotrex(features: any[]): Segment[] {
  return features.flatMap((f): Segment[] => {
    const a = f?.attributes ?? {};
    const name = str(a.name);
    const paths = esriPaths(f?.geometry);
    if (!name || !paths.length) return [];
    return [{
      source: "cotrex", sourceId: String(a.feature_id ?? a.OBJECTID), name, manager: str(a.manager),
      paths, lengthMi: numOrNull(a.length_mi_),
      elevMinM: numOrNull(a.min_elevat), elevMaxM: numOrNull(a.max_elevat),
      surface: str(a.surface), hiking: str(a.hiking), bike: str(a.bike), horse: str(a.horse), dogs: str(a.dogs), access: str(a.access),
      trailNo: str(a.trail_num), updated: numOrNull(a.EDIT_DATE),
    }];
  });
}

export function parseCotrexTrailheads(features: any[]): Trailhead[] {
  return features.flatMap((f): Trailhead[] => {
    const a = f?.attributes ?? {};
    const name = str(a.name);
    const x = f?.geometry?.x, y = f?.geometry?.y;
    if (!name || !Number.isFinite(x) || !Number.isFinite(y)) return [];
    return [{
      source: "cotrex", sourceId: String(a.feature_id ?? a.OBJECTID), name, lat: y, lon: x, manager: str(a.manager),
      fee: str(a.fee), water: str(a.water), bathrooms: str(a.bathrooms),
    }];
  });
}

/* ---- USFS ---- */
export const USFS_WHERE = "trail_name IS NOT NULL AND (trail_type IS NULL OR trail_type = 'TERRA')";
const USFS_FIELDS = ["objectid", "trail_cn", "trail_no", "trail_name", "gis_miles", "segment_length", "trail_class", "trail_surface", "typical_trail_grade", "accessibility_status", "hiker_pedestrian_managed", "managing_org"];

/* The Forest Service's Trail Class scale (FSH 2309.18): how developed the
   tread is, not how hard the hike is. */
export const USFS_TRAIL_CLASS: Record<string, string> = {
  "1": "Trail class 1 of 5: minimally developed",
  "2": "Trail class 2 of 5: moderately developed",
  "3": "Trail class 3 of 5: developed",
  "4": "Trail class 4 of 5: highly developed",
  "5": "Trail class 5 of 5: fully developed",
};

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase());

export function parseUsfs(features: any[]): Segment[] {
  return features.flatMap((f): Segment[] => {
    const a = f?.attributes ?? {};
    const raw = str(a.trail_name);
    const paths = esriPaths(f?.geometry);
    if (!raw || !paths.length) return [];
    const cls = str(a.trail_class)?.replace(/^TC/i, "") ?? null;
    return [{
      source: "usfs", sourceId: String(a.trail_cn ?? a.objectid), name: titleCase(raw), manager: "U.S. Forest Service",
      paths, lengthMi: numOrNull(a.segment_length) ?? numOrNull(a.gis_miles),
      surface: str(a.trail_surface)?.toLowerCase() ?? null,
      trailClass: cls && USFS_TRAIL_CLASS[cls] ? cls : null,
      grade: str(a.typical_trail_grade),
      accessibility: str(a.accessibility_status),
      hikerSeason: str(a.hiker_pedestrian_managed),
      trailNo: str(a.trail_no),
    }];
  });
}

/* ---- NPS ---- */
export const NPS_WHERE = "TRLNAME IS NOT NULL AND TRLSTATUS = 'Existing' AND PUBLICDISPLAY = 'Public Map Display'";
const NPS_FIELDS = ["OBJECTID", "TRLNAME", "TRLSURFACE", "TRLCLASS", "TRLUSE", "UNITNAME", "EDITDATE", "ACCESSNOTES"];

export function parseNps(features: any[]): Segment[] {
  return features.flatMap((f): Segment[] => {
    const a = f?.attributes ?? {};
    const name = str(a.TRLNAME);
    const paths = esriPaths(f?.geometry);
    if (!name || !paths.length) return [];
    const cls = str(a.TRLCLASS);
    const n = cls?.match(/^Class\s*([1-5])/i)?.[1] ?? null; // NPS also says "Unknown": that stays unrated
    return [{
      source: "nps", sourceId: String(a.OBJECTID), name, manager: str(a.UNITNAME) ?? "National Park Service",
      paths, lengthMi: null, surface: str(a.TRLSURFACE)?.toLowerCase() ?? null,
      trailClass: n, trailClassLabel: n ? cls : null, useText: str(a.TRLUSE), access: str(a.ACCESSNOTES),
      updated: numOrNull(a.EDITDATE),
    }];
  });
}

/* ---- BLM ---- */
export const BLM_WHERE = "ROUTE_PRMRY_NM IS NOT NULL";
const BLM_FIELDS = ["OBJECTID", "ROUTE_PRMRY_NM", "OBSRVE_SRFCE_TYPE", "PLAN_MODE_TRNSPRT", "PLAN_ACCESS_RSTRCT", "BLM_MILES", "GIS_MILES", "ADMIN_ST"];

export function parseBlm(features: any[]): Segment[] {
  return features.flatMap((f): Segment[] => {
    const a = f?.attributes ?? {};
    const raw = str(a.ROUTE_PRMRY_NM);
    const paths = esriPaths(f?.geometry);
    if (!raw || !paths.length) return [];
    const access = str(a.PLAN_ACCESS_RSTRCT);
    return [{
      source: "blm", sourceId: String(a.OBJECTID), name: titleCase(raw), manager: "Bureau of Land Management",
      paths, lengthMi: numOrNull(a.BLM_MILES) ?? numOrNull(a.GIS_MILES),
      surface: str(a.OBSRVE_SRFCE_TYPE)?.toLowerCase() ?? null,
      useText: str(a.PLAN_MODE_TRNSPRT), access: access && access.toLowerCase() !== "none" ? access : null,
    }];
  });
}

/* ---- OpenStreetMap / Overpass ---- */
export function overpassQuery(b: Bbox, limit = 2500): string {
  const box = [b.south, b.west, b.north, b.east].map((n) => n.toFixed(4)).join(",");
  return `[out:json][timeout:25];way["highway"~"^(path|footway|bridleway)$"]["name"]["footway"!~"sidewalk|crossing"]["access"!~"^(private|no)$"](${box});out tags geom ${limit};`;
}

export function parseOverpass(j: any): Segment[] {
  const els = Array.isArray(j?.elements) ? j.elements : [];
  return els.flatMap((e: any): Segment[] => {
    const t = e?.tags ?? {};
    const name = str(t.name);
    if (e?.type !== "way" || !name || !Array.isArray(e.geometry)) return [];
    const path: LatLon[] = e.geometry.filter((p: any) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)).map((p: any): LatLon => [p.lat, p.lon]);
    if (path.length < 2) return [];
    return [{
      source: "osm", sourceId: `way/${e.id}`, name, manager: str(t.operator),
      paths: [path], lengthMi: null,
      surface: str(t.surface), dogs: str(t.dog), sacScale: str(t.sac_scale), wheelchair: str(t.wheelchair),
      bike: str(t.bicycle), horse: str(t.horse), access: str(t.access),
    }];
  });
}

/* ---- fetchers ---- */
export interface SourceResult<T> { status: "ok" | "skipped" | "error"; items: T[]; /** radius actually covered, when the area was too dense */ limitedToMi?: number }

/** Queries a layer, shrinking the box (nearest first) when the full radius holds more than we'll page through. */
async function denseSafe(
  layerUrl: string, where: string, lat: number, lon: number, radiusMi: number, fetchImpl: Fetch,
): Promise<{ box: Bbox; limitedToMi?: number }> {
  let r = radiusMi;
  for (let i = 0; i < 8; i++) {
    const box = bboxAround(lat, lon, r);
    const n = await arcgisCount(layerUrl, where, box, fetchImpl);
    if (n <= MAX_PER_SOURCE) return { box, limitedToMi: r < radiusMi ? Math.round(r) : undefined };
    /* shrink in proportion to how far over we are (area scales with r²), never by more than half */
    r = r * Math.max(0.5, Math.min(0.9, Math.sqrt(MAX_PER_SOURCE / n) * 0.95));
  }
  return { box: bboxAround(lat, lon, r), limitedToMi: Math.round(r) };
}

const simplifyFor = (radiusMi: number) => (radiusMi > 20 ? 0.0004 : radiusMi > 8 ? 0.0002 : 0.0001);

export async function fetchCotrex(lat: number, lon: number, radiusMi: number, fetchImpl: Fetch = fetch): Promise<SourceResult<Segment> & { trailheads: Trailhead[] }> {
  if (!intersects(bboxAround(lat, lon, radiusMi), COLORADO)) return { status: "skipped", items: [], trailheads: [] };
  try {
    const { box, limitedToMi } = await denseSafe(`${COTREX_URL}/40`, COTREX_WHERE, lat, lon, radiusMi, fetchImpl);
    const [segs, ths] = await Promise.all([
      arcgisQuery(`${COTREX_URL}/40`, COTREX_WHERE, COTREX_FIELDS, box, fetchImpl, { orderBy: "OBJECTID", simplifyDeg: simplifyFor(radiusMi) }),
      arcgisQuery(`${COTREX_URL}/29`, "1=1", ["OBJECTID", "feature_id", "name", "manager", "fee", "water", "bathrooms"], box, fetchImpl, { orderBy: "OBJECTID" })
        .catch(() => []),
    ]);
    return { status: "ok", items: parseCotrex(segs), trailheads: parseCotrexTrailheads(ths), limitedToMi };
  } catch {
    return { status: "error", items: [], trailheads: [] };
  }
}

/* The Forest Service layer covers the 50 states; skip it for searches entirely in Canada or Mexico. */
const US_BOXES: Bbox[] = [
  { south: 24.4, west: -125, north: 49.1, east: -66.9 },
  { south: 51, west: -170, north: 71.5, east: -129.9 },
  { south: 18.8, west: -160.3, north: 22.3, east: -154.7 },
];

export async function fetchUsfs(lat: number, lon: number, radiusMi: number, fetchImpl: Fetch = fetch): Promise<SourceResult<Segment>> {
  if (!US_BOXES.some((b) => intersects(bboxAround(lat, lon, radiusMi), b))) return { status: "skipped", items: [] };
  try {
    const { box, limitedToMi } = await denseSafe(USFS_URL, USFS_WHERE, lat, lon, radiusMi, fetchImpl);
    const feats = await arcgisQuery(USFS_URL, USFS_WHERE, USFS_FIELDS, box, fetchImpl, { orderBy: "objectid", simplifyDeg: simplifyFor(radiusMi) });
    return { status: "ok", items: parseUsfs(feats), limitedToMi };
  } catch {
    return { status: "error", items: [] };
  }
}

async function fetchFederal(
  url: string, where: string, fields: string[], parse: (f: any[]) => Segment[],
  lat: number, lon: number, radiusMi: number, fetchImpl: Fetch,
): Promise<SourceResult<Segment>> {
  if (!US_BOXES.some((b) => intersects(bboxAround(lat, lon, radiusMi), b))) return { status: "skipped", items: [] };
  try {
    const { box, limitedToMi } = await denseSafe(url, where, lat, lon, radiusMi, fetchImpl);
    const feats = await arcgisQuery(url, where, fields, box, fetchImpl, { orderBy: "OBJECTID", simplifyDeg: simplifyFor(radiusMi) });
    return { status: "ok", items: parse(feats), limitedToMi };
  } catch {
    return { status: "error", items: [] };
  }
}

export const fetchNps = (lat: number, lon: number, radiusMi: number, fetchImpl: Fetch = fetch) =>
  fetchFederal(NPS_URL, NPS_WHERE, NPS_FIELDS, parseNps, lat, lon, radiusMi, fetchImpl);
export const fetchBlm = (lat: number, lon: number, radiusMi: number, fetchImpl: Fetch = fetch) =>
  fetchFederal(BLM_URL, BLM_WHERE, BLM_FIELDS, parseBlm, lat, lon, radiusMi, fetchImpl);

/** OSM is the gap-filler: capped at 15 mi so a big radius doesn't pull a city's every footway. */
export const OSM_MAX_MI = 15;

export async function fetchOsm(lat: number, lon: number, radiusMi: number, fetchImpl: Fetch = fetch): Promise<SourceResult<Segment>> {
  const r = Math.min(radiusMi, OSM_MAX_MI);
  try {
    const j = await getJson(OVERPASS_URL, fetchImpl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json" },
      body: "data=" + encodeURIComponent(overpassQuery(bboxAround(lat, lon, r))),
    }, 30_000);
    return { status: "ok", items: parseOverpass(j), limitedToMi: r < radiusMi ? r : undefined };
  } catch {
    return { status: "error", items: [] };
  }
}
