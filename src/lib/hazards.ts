import { haversineMi } from "./geo";
import { loadKey, saveKey } from "./storage";

/* ---------- LIVE HAZARDS ----------
   Adapted from SOS's Connect & Alerts. Nothing here runs until the person
   taps a check, and every answer carries its source, the time it was fetched
   and the point it was asked about. All four sources are free, keyless and
   called straight from the phone:
     alerts       US National Weather Service, active alerts for a point
     air          Open-Meteo air quality (CAMS model), current US AQI
     facilities   OpenStreetMap via Overpass: hospitals, clinics, ranger
                  stations, police and fire stations nearby
     quakes       USGS, magnitude 2.5+ in the past week within 300 km
   Forecasts are not repeated here; the app's own forecast covers that.

   One rule from SOS is changed on purpose: SOS showed "no active alerts" when
   the NWS request failed. Here a failed request is a failure, and an empty
   answer says that it only means nothing was returned. */

export type HazardKind = "alerts" | "air" | "facilities" | "quakes";
export interface Point { lat: number; lon: number; label: string }

export interface NwsAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string | null;
  area: string;
  effective: string | null;
  ends: string | null;
  sender: string;
  instruction: string | null;
}
export interface AirNow { aqi: number; pm25: number | null; pm10: number | null; time: string | null }
export interface Facility { name: string; type: string; phone: string | null; mi: number; lat: number; lon: number }
export interface Quake { mag: number; place: string; time: number; url: string; mi: number }

export interface HazardData { alerts: NwsAlert[]; air: AirNow; facilities: Facility[]; quakes: Quake[] }

export type HazardResult<K extends HazardKind> =
  | { ok: true; kind: K; at: number; point: Point; data: HazardData[K] }
  | { ok: false; kind: K; at: number; point: Point; reason: "offline" | "failed" | "outside" };

export const SOURCE: Record<HazardKind, { name: string; scope: string; url: string }> = {
  alerts: { name: "National Weather Service", scope: "Active alerts whose area covers this point (US only)", url: "https://www.weather.gov/" },
  air: { name: "Open-Meteo air quality (CAMS model)", scope: "Modelled for this point, not a sensor reading", url: "https://open-meteo.com/en/docs/air-quality-api" },
  facilities: { name: "OpenStreetMap contributors", scope: "Mapped within 25 km of this point; may be incomplete or out of date", url: "https://www.openstreetmap.org/copyright" },
  quakes: { name: "U.S. Geological Survey", scope: "Magnitude 2.5 and up, past 7 days, within 300 km", url: "https://earthquake.usgs.gov/earthquakes/map/" },
};

/** How old an answer can be before it is marked stale. Alerts change fastest. */
export const STALE_MS: Record<HazardKind, number> = {
  alerts: 60 * 60 * 1000,
  air: 3 * 60 * 60 * 1000,
  facilities: 30 * 24 * 60 * 60 * 1000,
  quakes: 6 * 60 * 60 * 1000,
};
export const isStale = (r: { at: number; kind: HazardKind }, now = Date.now()) => now - r.at > STALE_MS[r.kind];

/** "just now", "12 min ago", "3 hr ago", "2 days ago" */
export function ageText(at: number, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/* ---------- parsers (pure, unit tested) ---------- */
export function parseAlerts(json: any): NwsAlert[] {
  const feats = Array.isArray(json?.features) ? json.features : null;
  if (!feats) throw new Error("unexpected alerts payload");
  const rank: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };
  return feats.map((f: any) => {
    const p = f?.properties ?? {};
    return {
      id: String(p.id ?? f.id ?? Math.random()),
      event: String(p.event ?? "Alert"),
      severity: String(p.severity ?? "Unknown"),
      urgency: String(p.urgency ?? "Unknown"),
      headline: p.headline ? String(p.headline) : null,
      area: String(p.areaDesc ?? ""),
      effective: p.effective ?? p.onset ?? null,
      ends: p.ends ?? p.expires ?? null,
      sender: String(p.senderName ?? "National Weather Service"),
      instruction: p.instruction ? String(p.instruction) : null,
    };
  }).sort((a: NwsAlert, b: NwsAlert) => (rank[a.severity] ?? 4) - (rank[b.severity] ?? 4));
}

export function parseAir(json: any): AirNow {
  const c = json?.current;
  if (!c || typeof c.us_aqi !== "number") throw new Error("no aqi");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
  return { aqi: Math.round(c.us_aqi), pm25: num(c.pm2_5), pm10: num(c.pm10), time: typeof c.time === "string" ? c.time : null };
}

/** EPA's AQI categories. sev drives color only; the label carries the meaning. */
export function aqiCategory(aqi: number): { label: string; sev: "mild" | "moderate" | "severe" } {
  if (aqi <= 50) return { label: "Good", sev: "mild" };
  if (aqi <= 100) return { label: "Moderate", sev: "mild" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", sev: "moderate" };
  if (aqi <= 200) return { label: "Unhealthy", sev: "severe" };
  if (aqi <= 300) return { label: "Very unhealthy", sev: "severe" };
  return { label: "Hazardous", sev: "severe" };
}

const FACILITY_KIND: Record<string, string> = {
  hospital: "Hospital", clinic: "Clinic", police: "Police", fire_station: "Fire station", ranger_station: "Ranger station",
};
export function parseFacilities(json: any, at: { lat: number; lon: number }): Facility[] {
  const els = Array.isArray(json?.elements) ? json.elements : null;
  if (!els) throw new Error("unexpected overpass payload");
  return els.map((el: any) => {
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    const tags = el.tags ?? {};
    const type = FACILITY_KIND[tags.amenity] ?? (tags.healthcare === "hospital" ? "Hospital" : null);
    if (!type) return null;
    return { name: tags.name || `Unnamed ${type.toLowerCase()}`, type, phone: tags.phone || tags["contact:phone"] || null, mi: haversineMi(at.lat, at.lon, lat, lon), lat, lon };
  }).filter(Boolean).sort((a: Facility, b: Facility) => a.mi - b.mi).slice(0, 12);
}

export const QUAKE_RADIUS_KM = 300;
export function parseQuakes(json: any, at: { lat: number; lon: number }): Quake[] {
  const feats = Array.isArray(json?.features) ? json.features : null;
  if (!feats) throw new Error("unexpected usgs payload");
  const maxMi = QUAKE_RADIUS_KM / 1.609344;
  return feats.map((f: any) => {
    const c = f?.geometry?.coordinates, p = f?.properties ?? {};
    if (!Array.isArray(c) || typeof p.mag !== "number") return null;
    return { mag: p.mag, place: String(p.place ?? "Unknown location"), time: Number(p.time), url: String(p.url ?? ""), mi: haversineMi(at.lat, at.lon, c[1], c[0]) };
  }).filter((q: Quake | null): q is Quake => !!q && q.mi <= maxMi).sort((a: Quake, b: Quake) => b.time - a.time).slice(0, 8);
}

/* ---------- fetch ---------- */
export function hazardUrl(kind: HazardKind, p: { lat: number; lon: number }): string {
  const la = p.lat.toFixed(4), lo = p.lon.toFixed(4);
  switch (kind) {
    case "alerts": return `https://api.weather.gov/alerts/active?point=${la},${lo}`;
    case "air": return `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${la}&longitude=${lo}&current=us_aqi,pm2_5,pm10&timezone=auto`;
    case "quakes": return "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
    case "facilities": return "https://overpass-api.de/api/interpreter";
  }
}
const overpassQuery = (p: { lat: number; lon: number }) => {
  const a = `(around:25000,${p.lat.toFixed(4)},${p.lon.toFixed(4)})`;
  return `[out:json][timeout:20];(nwr["amenity"~"^(hospital|clinic|police|fire_station|ranger_station)$"]${a};nwr["healthcare"="hospital"]${a};);out center tags;`;
};

const CACHE_KEY = "co-field-hazards-v1";
type Cache = Partial<{ [K in HazardKind]: HazardResult<K> }>;
export const loadCachedHazards = (): Cache => {
  const c = loadKey<Cache>(CACHE_KEY);
  return c && typeof c === "object" ? c : {};
};
const saveCached = (r: HazardResult<HazardKind>) => {
  if (!r.ok) return;
  saveKey(CACHE_KEY, { ...loadCachedHazards(), [r.kind]: r });
};

export async function checkHazard<K extends HazardKind>(kind: K, point: Point, fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<HazardResult<K>> {
  const fail = (reason: "offline" | "failed" | "outside"): HazardResult<K> => ({ ok: false, kind, at: now, point, reason });
  if (typeof navigator !== "undefined" && navigator.onLine === false) return fail("offline");
  try {
    const init: RequestInit | undefined = kind === "facilities"
      ? { method: "POST", body: "data=" + encodeURIComponent(overpassQuery(point)), headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      : kind === "alerts" ? { headers: { Accept: "application/geo+json" } } : undefined;
    const res = await fetchImpl(hazardUrl(kind, point), init);
    /* NWS answers 404 for points it doesn't cover (outside the US) */
    if (kind === "alerts" && (res.status === 404 || res.status === 400)) return fail("outside");
    if (!res.ok) return fail("failed");
    const json = await res.json();
    const data = (kind === "alerts" ? parseAlerts(json) : kind === "air" ? parseAir(json) : kind === "facilities" ? parseFacilities(json, point) : parseQuakes(json, point)) as HazardData[K];
    const r: HazardResult<K> = { ok: true, kind, at: now, point, data };
    saveCached(r as HazardResult<HazardKind>);
    return r;
  } catch {
    return fail(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "failed");
  }
}
