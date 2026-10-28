import { loadKey, saveKey } from "./storage";

/* ---------- ADDRESS & PLACE SEARCH ----------
   Free, keyless, no secrets in the client:
     Nominatim (OpenStreetMap Foundation)  primary. Its usage policy allows
       a site's own users searching on demand: at most one request a second,
       no search-as-you-type, results cached, OSM credited. So we search on
       submit only, throttle to 1/s and cache answers on the device.
     Photon (komoot, also OSM data)        fallback when Nominatim refuses
       (403/429) or is unreachable. Same data, different operator.
   Both were checked live (CORS open, JSON) while building this. Results
   are limited to the US, Canada and Mexico, where the trail sources are. */
export interface GeoResult {
  id: string;
  /** short name: "Estes Park", "1200 Pearl St" */
  label: string;
  /** the rest of the address line */
  detail: string;
  lat: number;
  lon: number;
  /** what the provider says it is: town, postcode, park, peak… */
  kind: string;
  source: "nominatim" | "photon";
}

export type GeocodeOutcome =
  | { status: "ok"; results: GeoResult[] }
  | { status: "empty" }
  | { status: "error"; kind: "offline" | "rate" | "unavailable" };

export const GEOCODE_MESSAGE = {
  empty: "Nothing found by that name. Try a town, ZIP code, park or full street address.",
  offline: "You're offline. Address search needs a connection; your saved trails still work.",
  rate: "The address service is busy. Wait a few seconds and try again.",
  unavailable: "The address service didn't answer. Try again, or use your location.",
} as const;

const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io";
const COUNTRIES = ["us", "ca", "mx"];
const CACHE_KEY = "co-field-geocode-v1";
const CACHE_MAX = 40;
const CACHE_DAYS = 30;

type Fetch = typeof fetch;
class HttpError extends Error { constructor(public status: number) { super("http " + status); } }

let lastNominatim = 0;
/** Nominatim allows one request per second from an app; wait out the gap. */
async function throttle(now = () => Date.now(), wait = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  const gap = 1100 - (now() - lastNominatim);
  if (gap > 0) await wait(gap);
  lastNominatim = now();
}
export function _resetThrottle() { lastNominatim = 0; }

async function getJson(url: string, fetchImpl: Fetch): Promise<any> {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), 10_000);
  try {
    const res = await fetchImpl(url, { signal: ctl?.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new HttpError(res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);
const okCoord = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const tidy = (s: string) => s.replace(/,\s*United States$/, "").replace(/,\s*United States of America$/, "");

export function parseNominatim(j: unknown): GeoResult[] {
  if (!Array.isArray(j)) return [];
  return j.flatMap((r: any): GeoResult[] => {
    const lat = num(r?.lat), lon = num(r?.lon);
    if (!okCoord(lat, lon) || typeof r.display_name !== "string") return [];
    const parts = r.display_name.split(",").map((s: string) => s.trim());
    const label = (typeof r.name === "string" && r.name) || parts[0];
    const rest = parts[0] === label ? parts.slice(1) : parts;
    return [{
      id: `osm:${String(r.osm_type ?? "x").charAt(0).toUpperCase()}${r.osm_id ?? r.place_id ?? `${lat},${lon}`}`,
      label, detail: tidy(rest.join(", ")), lat, lon,
      kind: String(r.addresstype || r.type || r.category || "place").replace(/_/g, " "),
      source: "nominatim",
    }];
  });
}

export function parsePhoton(j: unknown): GeoResult[] {
  const feats = (j as any)?.features;
  if (!Array.isArray(feats)) return [];
  return feats.flatMap((f: any): GeoResult[] => {
    const p = f?.properties ?? {};
    const [lon, lat] = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates.map(Number) : [NaN, NaN];
    if (!okCoord(lat, lon)) return [];
    if (p.countrycode && !COUNTRIES.includes(String(p.countrycode).toLowerCase())) return [];
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const label = p.name || street || p.city || p.postcode;
    if (!label) return [];
    const detail = [p.name && street ? street : null, p.city !== label ? p.city : null, p.county, p.state, p.postcode !== label ? p.postcode : null]
      .filter(Boolean).join(", ");
    return [{
      id: `osm:${String(p.osm_type ?? "x").toUpperCase()}${p.osm_id ?? `${lat},${lon}`}`,
      label: String(label), detail, lat, lon,
      kind: String(p.type === "other" ? p.osm_value : p.type || p.osm_value || "place").replace(/_/g, " "),
      source: "photon",
    }];
  });
}

/** Same place listed twice (two OSM objects for one town): keep the first. */
export function dedupeResults(rs: GeoResult[]): GeoResult[] {
  const seen = new Set<string>();
  return rs.filter((r) => {
    const k = `${r.label.toLowerCase()}|${r.lat.toFixed(2)}|${r.lon.toFixed(2)}`;
    if (seen.has(r.id) || seen.has(k)) return false;
    seen.add(r.id); seen.add(k);
    return true;
  });
}

type Cache = Record<string, { t: number; v: GeoResult[] }>;
const normQ = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

export async function geocode(query: string, opts: { fetchImpl?: Fetch; online?: boolean; noThrottle?: boolean } = {}): Promise<GeocodeOutcome> {
  const q = normQ(query);
  if (q.length < 2) return { status: "empty" };
  const cache = loadKey<Cache>(CACHE_KEY) ?? {};
  const hit = cache[q];
  if (hit && Date.now() - hit.t < CACHE_DAYS * 86_400_000) return hit.v.length ? { status: "ok", results: hit.v } : { status: "empty" };
  const online = opts.online ?? (typeof navigator === "undefined" || navigator.onLine !== false);
  if (!online) return { status: "error", kind: "offline" };
  const fetchImpl = opts.fetchImpl ?? fetch;

  let results: GeoResult[] | null = null;
  let rateLimited = false;
  try {
    if (!opts.noThrottle) await throttle();
    const url = `${NOMINATIM}/search?q=${encodeURIComponent(query.trim())}&format=jsonv2&limit=6&countrycodes=${COUNTRIES.join(",")}&accept-language=en`;
    results = parseNominatim(await getJson(url, fetchImpl));
  } catch (e) {
    rateLimited = e instanceof HttpError && (e.status === 429 || e.status === 403);
  }
  if (results === null) {
    try {
      const url = `${PHOTON}/api/?q=${encodeURIComponent(query.trim())}&limit=8&lang=en`;
      results = parsePhoton(await getJson(url, fetchImpl));
    } catch (e) {
      const rate = rateLimited || (e instanceof HttpError && e.status === 429);
      return { status: "error", kind: rate ? "rate" : "unavailable" };
    }
  }
  const out = dedupeResults(results).slice(0, 6);
  cache[q] = { t: Date.now(), v: out };
  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX) keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - CACHE_MAX).forEach((k) => delete cache[k]);
  saveKey(CACHE_KEY, cache);
  return out.length ? { status: "ok", results: out } : { status: "empty" };
}

/** "near Boulder, Colorado" for a GPS fix; null when the lookup fails (it's only a label). */
export async function placeNameNear(lat: number, lon: number, fetchImpl: Fetch = fetch): Promise<string | null> {
  try {
    await throttle();
    const j = await getJson(`${NOMINATIM}/reverse?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&format=jsonv2&zoom=10&accept-language=en`, fetchImpl);
    const a = j?.address ?? {};
    const town = a.city || a.town || a.village || a.hamlet || a.county;
    return town ? [town, a.state].filter(Boolean).join(", ") : null;
  } catch {
    return null;
  }
}
