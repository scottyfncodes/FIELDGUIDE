import { cached, getJson, parsePhoto, stripHtml, store } from "./inat";
import type { InatPhoto } from "./inat";
import { groupMeta } from "./vision";
import type { WildGroup } from "./vision";

/* ---------- WILDLIFE FROM iNATURALIST ----------
   The species-information half of Nature ID (separate from recognizing a
   photo, which iNaturalist's own vision API doesn't open to third-party
   apps: it answered 401 when checked). All of this is read-only, keyless and
   cached on the device, like the plant lookups in inat.ts.

     nearby   research-grade species recorded within a radius, optionally in
              given months: "observed sightings", never "likely to occur"
     taxon    one species: photo, Wikipedia summary, conservation statuses,
              iconic group, observation count
     months   research-grade records by month near a point, or in Colorado
     resolve  the model's scientific name -> an active iNaturalist taxon,
              by exact name only. Everything after that uses the taxon id.

   iNaturalist hides or blurs the coordinates of threatened species (taxon
   geoprivacy), so "recorded nearby" never exposes a sensitive location. */
const DAY = 86_400_000;

export interface WildSpecies { taxonId: number; name: string; common: string | null; iconic: string | null; count: number; photo: InatPhoto | null }

export interface ConservationStatus { authority: string | null; status: string; statusName: string | null; place: string | null; iucn: number | null }

export interface WildTaxon {
  id: number;
  name: string;
  common: string | null;
  rank: string;
  iconic: string | null;
  photo: InatPhoto | null;
  summary: string | null;
  wikipediaUrl: string | null;
  observations: number;
  statuses: ConservationStatus[];
  /** iNaturalist obscures this taxon's locations, or a status says threatened */
  sensitive: boolean;
}

export function parseWildSpecies(j: any): WildSpecies[] {
  return (Array.isArray(j?.results) ? j.results : [])
    .filter((r: any) => r?.taxon && typeof r.taxon.id === "number")
    .map((r: any) => ({
      taxonId: r.taxon.id, name: String(r.taxon.name ?? ""), common: r.taxon.preferred_common_name ?? null,
      iconic: r.taxon.iconic_taxon_name ?? null, count: Number(r.count) || 0, photo: parsePhoto(r.taxon.default_photo),
    }));
}

const monthsAround = (m: number) => [((m + 10) % 12) + 1, m, (m % 12) + 1];

/** Species with research-grade records within `radiusKm`, in the given months (default: this month and its neighbours). */
export async function fetchNearbyWildlife(
  lat: number, lon: number, group: WildGroup,
  opts: { radiusKm?: number; month?: number | null; perPage?: number; fetchImpl?: typeof fetch } = {},
): Promise<WildSpecies[] | null> {
  const radius = opts.radiusKm ?? 10;
  const months = opts.month ? monthsAround(opts.month) : null;
  const iconic = groupMeta(group).iconic.join(",");
  const key = `wild:${group}:${lat.toFixed(2)},${lon.toFixed(2)},${radius}:${months?.join("-") ?? "all"}`;
  const hit = cached<WildSpecies[]>(key, 3 * DAY);
  if (hit) return hit;
  try {
    const j = await getJson(
      `/observations/species_counts?lat=${lat.toFixed(4)}&lng=${lon.toFixed(4)}&radius=${radius}&quality_grade=research` +
      `&iconic_taxa=${iconic}${months ? `&month=${months.join(",")}` : ""}&per_page=${opts.perPage ?? 30}`, opts.fetchImpl);
    const out = parseWildSpecies(j);
    store(key, out);
    return out;
  } catch {
    return null;
  }
}

export function parseWildTaxon(t: any): WildTaxon | null {
  if (!t || typeof t.id !== "number") return null;
  const statuses: ConservationStatus[] = (Array.isArray(t.conservation_statuses) ? t.conservation_statuses : [])
    .filter((s: any) => s && typeof s.status === "string")
    .map((s: any) => ({
      authority: s.authority ?? null, status: s.status, statusName: s.status_name ?? null,
      place: s.place?.display_name ?? s.place?.name ?? null, iucn: typeof s.iucn === "number" ? s.iucn : null,
    }));
  const cs = t.conservation_status;
  if (cs && typeof cs.status === "string" && !statuses.some((s) => s.status === cs.status && s.authority === (cs.authority ?? null))) {
    statuses.unshift({ authority: cs.authority ?? null, status: cs.status, statusName: cs.status_name ?? null, place: cs.place?.display_name ?? null, iucn: typeof cs.iucn === "number" ? cs.iucn : null });
  }
  /* IUCN codes as iNaturalist numbers them: 30 vulnerable and up is threatened */
  const sensitive = t.threatened === true || statuses.some((s) => (s.iucn != null && s.iucn >= 30 && s.iucn < 70) ||
    /\b(endangered|threatened|vulnerable)\b/i.test(s.statusName ?? "") || ["S1", "S2", "G1", "G2", "EN", "CR", "VU", "T", "E"].includes(s.status.toUpperCase()));
  return {
    id: t.id, name: String(t.name ?? ""), common: t.preferred_common_name ?? null, rank: String(t.rank ?? ""),
    iconic: t.iconic_taxon_name ?? null, photo: parsePhoto(t.default_photo), summary: stripHtml(t.wikipedia_summary),
    wikipediaUrl: typeof t.wikipedia_url === "string" ? t.wikipedia_url.replace(/^http:/, "https:") : null,
    observations: Number(t.observations_count) || 0, statuses, sensitive,
  };
}

export async function fetchWildTaxon(id: number, fetchImpl?: typeof fetch): Promise<WildTaxon | null> {
  const key = `wtaxon:${id}`;
  const hit = cached<WildTaxon>(key, 30 * DAY);
  if (hit) return hit;
  try {
    const t = parseWildTaxon((await getJson(`/taxa/${id}`, fetchImpl))?.results?.[0]);
    if (t) store(key, t);
    return t;
  } catch {
    return null;
  }
}

/** Records by month (index 0 = January): near a point when given, else Colorado (place 34). */
export async function fetchWildMonths(id: number, near: { lat: number; lon: number } | null, fetchImpl?: typeof fetch): Promise<{ months: number[]; where: "near" | "colorado" } | null> {
  const where = near ? `lat=${near.lat.toFixed(2)}&lng=${near.lon.toFixed(2)}&radius=50` : "place_id=34";
  const key = `wmonths:${id}:${near ? `${near.lat.toFixed(1)},${near.lon.toFixed(1)}` : "co"}`;
  const hit = cached<{ months: number[]; where: "near" | "colorado" }>(key, 30 * DAY);
  if (hit) return hit;
  try {
    const j = await getJson(`/observations/histogram?taxon_id=${id}&${where}&interval=month_of_year&quality_grade=research`, fetchImpl);
    const m = j?.results?.month_of_year;
    if (!m) return null;
    const out = { months: Array.from({ length: 12 }, (_, i) => Number(m[i + 1]) || 0), where: near ? "near" as const : "colorado" as const };
    store(key, out);
    return out;
  } catch {
    return null;
  }
}

/** Exact scientific-name match to an active taxon in the right group; null when there isn't one. */
export async function resolveTaxon(scientificName: string, group: WildGroup, fetchImpl?: typeof fetch): Promise<WildTaxon | null> {
  const q = scientificName.trim();
  if (!q) return null;
  const key = `resolve:${q.toLowerCase()}`;
  const hit = cached<WildTaxon | 0>(key, 30 * DAY);
  if (hit !== undefined) return hit || null;
  try {
    const j = await getJson(`/taxa?q=${encodeURIComponent(q)}&is_active=true&per_page=10`, fetchImpl);
    const iconic = groupMeta(group).iconic;
    const exact = (Array.isArray(j?.results) ? j.results : [])
      .find((t: any) => typeof t?.name === "string" && t.name.toLowerCase() === q.toLowerCase() && (!t.iconic_taxon_name || iconic.includes(t.iconic_taxon_name) || group === "animal"));
    const t = exact ? parseWildTaxon(exact) : null;
    store(key, t ?? 0);
    return t;
  } catch {
    return null;
  }
}

/** Name search inside one group, for "pick it yourself". */
export async function searchWildTaxa(q: string, group: WildGroup | null, fetchImpl?: typeof fetch): Promise<WildSpecies[] | null> {
  if (q.trim().length < 2) return [];
  try {
    const j = await getJson(`/taxa/autocomplete?q=${encodeURIComponent(q.trim())}&is_active=true&per_page=15`, fetchImpl);
    const iconic = group ? groupMeta(group).iconic : ["Aves", "Insecta", "Arachnida", "Mammalia", "Reptilia", "Amphibia"];
    return (Array.isArray(j?.results) ? j.results : [])
      .filter((t: any) => typeof t?.id === "number" && iconic.includes(t.iconic_taxon_name))
      .map((t: any) => ({ taxonId: t.id, name: String(t.name ?? ""), common: t.preferred_common_name ?? null, iconic: t.iconic_taxon_name ?? null, count: Number(t.observations_count) || 0, photo: parsePhoto(t.default_photo) }));
  } catch {
    return null;
  }
}

export const ICONIC_LABEL: Record<string, string> = {
  Aves: "Bird", Insecta: "Insect", Arachnida: "Spider or kin", Mammalia: "Mammal", Reptilia: "Reptile", Amphibia: "Amphibian",
};

/* General wildlife-watching conduct by group (the usual leave-it-be advice), never a claim about a particular species. */
export const GROUP_CONDUCT: Record<string, string> = {
  Mammalia: "Give wildlife room: if it changes what it's doing because of you, you're too close. Never feed it. Keep dogs leashed.",
  Aves: "Keep your distance from nests and young birds; a parent is usually nearby.",
  Reptilia: "Watch where you put hands and feet in warm rocky places. Leave snakes alone and give them room to move off.",
  Arachnida: "Look, don't handle. A few spiders can bite.",
  Insecta: "Look, don't handle. Some insects sting or bite.",
  Amphibia: "Avoid handling: lotions and sunscreen on skin can harm amphibians.",
};
