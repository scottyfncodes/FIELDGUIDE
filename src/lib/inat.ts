import { loadKey, saveKey } from "./storage";

/* ---------- iNATURALIST ----------
   Public API, no key, CORS-open (verified against the live API while building
   this). Used for three things, all read-only:
     taxon      photo (credited, CC licensed) and Wikipedia summary for a guide species
     months     Colorado research-grade observations by month (place 34 = Colorado)
     nearby     research-grade plant species recorded within a few km of a place
   iNaturalist asks for well under 60 requests a minute; everything is cached
   on the device (taxon 30 days, nearby 7 days) and only fetched when a page
   that needs it is opened. Failures return null and the UI says it couldn't
   load, never fills in. */
const API = "https://api.inaturalist.org/v1";
const CACHE_KEY = "co-field-inat-v1";
const DAY = 86_400_000;
const MAX_ENTRIES = 160;

export interface InatPhoto { square: string; medium: string; attribution: string; license: string | null }
export interface InatTaxon {
  id: number;
  name: string;
  common: string | null;
  photo: InatPhoto | null;
  summary: string | null;
  wikipediaUrl: string | null;
}
export interface NearbySpecies { taxonId: number; name: string; common: string | null; count: number; photo: InatPhoto | null }

type Entry = { t: number; v: unknown };
type Cache = Record<string, Entry>;

const readCache = (): Cache => loadKey<Cache>(CACHE_KEY) ?? {};
export function cached<T>(key: string, maxAge: number): T | undefined {
  const e = readCache()[key];
  return e && Date.now() - e.t < maxAge ? (e.v as T) : undefined;
}
export function store(key: string, v: unknown) {
  const c = readCache();
  c[key] = { t: Date.now(), v };
  const keys = Object.keys(c);
  if (keys.length > MAX_ENTRIES) keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - MAX_ENTRIES).forEach((k) => delete c[k]);
  saveKey(CACHE_KEY, c);
}

export async function getJson(path: string, fetchImpl: typeof fetch = fetch): Promise<any> {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), 9000);
  try {
    const res = await fetchImpl(API + path, { signal: ctl?.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("inat http " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function parsePhoto(p: any): InatPhoto | null {
  const square = p?.square_url || p?.url;
  if (typeof square !== "string") return null;
  return {
    square,
    medium: typeof p.medium_url === "string" ? p.medium_url : square.replace("/square.", "/medium."),
    attribution: typeof p.attribution === "string" ? p.attribution : "iNaturalist contributor",
    license: typeof p.license_code === "string" ? p.license_code : null,
  };
}

/* Wikipedia summaries arrive as HTML; we show plain text only. */
export function stripHtml(s: unknown): string | null {
  if (typeof s !== "string" || !s.trim()) return null;
  return s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function parseTaxon(t: any): InatTaxon | null {
  if (!t || typeof t.id !== "number") return null;
  return {
    id: t.id, name: String(t.name ?? ""), common: t.preferred_common_name ?? null,
    photo: parsePhoto(t.default_photo), summary: stripHtml(t.wikipedia_summary),
    wikipediaUrl: typeof t.wikipedia_url === "string" ? t.wikipedia_url.replace(/^http:/, "https:") : null,
  };
}

export async function fetchTaxon(id: number, fetchImpl?: typeof fetch): Promise<InatTaxon | null> {
  const key = `taxon:${id}`;
  const hit = cached<InatTaxon>(key, 30 * DAY);
  if (hit) return hit;
  try {
    const j = await getJson(`/taxa/${id}`, fetchImpl);
    const t = parseTaxon(j?.results?.[0]);
    if (t) store(key, t);
    return t;
  } catch {
    return null;
  }
}

/** Research-grade Colorado observations per month, index 0 = January. */
export async function fetchMonths(id: number, fetchImpl?: typeof fetch): Promise<number[] | null> {
  const key = `months:${id}`;
  const hit = cached<number[]>(key, 30 * DAY);
  if (hit) return hit;
  try {
    const j = await getJson(`/observations/histogram?taxon_id=${id}&place_id=34&interval=month_of_year&quality_grade=research`, fetchImpl);
    const m = j?.results?.month_of_year;
    if (!m) return null;
    const out = Array.from({ length: 12 }, (_, i) => Number(m[i + 1]) || 0);
    store(key, out);
    return out;
  } catch {
    return null;
  }
}

export function parseNearby(j: any): NearbySpecies[] {
  return (Array.isArray(j?.results) ? j.results : [])
    .filter((r: any) => r?.taxon && typeof r.taxon.id === "number")
    .map((r: any) => ({
      taxonId: r.taxon.id, name: String(r.taxon.name ?? ""), common: r.taxon.preferred_common_name ?? null,
      count: Number(r.count) || 0, photo: parsePhoto(r.taxon.default_photo),
    }));
}

export async function fetchNearby(lat: number, lon: number, radiusKm = 3, fetchImpl?: typeof fetch): Promise<NearbySpecies[] | null> {
  const key = `near:${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`;
  const hit = cached<NearbySpecies[]>(key, 7 * DAY);
  if (hit) return hit;
  try {
    const j = await getJson(`/observations/species_counts?lat=${lat.toFixed(4)}&lng=${lon.toFixed(4)}&radius=${radiusKm}&quality_grade=research&iconic_taxa=Plantae&per_page=24`, fetchImpl);
    const out = parseNearby(j);
    store(key, out);
    return out;
  } catch {
    return null;
  }
}

export const taxonUrl = (id: number) => `https://www.inaturalist.org/taxa/${id}`;
export const LICENSE_TEXT = (code: string | null) => (code ? code.toUpperCase().replace(/^CC-/, "CC ") : "all rights reserved");
