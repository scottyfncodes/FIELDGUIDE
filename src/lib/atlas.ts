import { useSyncExternalStore } from "react";
import { speciesById } from "../data/species";
import { isPlaceRef, registerFoundPlaces } from "./places";
import type { PlaceRef } from "./places";
import { loadKey, saveKey } from "./storage";

/* ---------- MY ATLAS: the shared personal collection ----------
   Everything here is on this device (localStorage, photos in IndexedDB),
   exactly like the three original apps. Nothing is uploaded.

   Records and how they connect:
     Observation  one find: a photo and note at a place, on an outing, and an
                  identification (a guide species, or none yet). Never merged:
                  seeing aspen ten times is ten observations of one species.
     Species      the shared record, from the field guide (data/species.ts),
                  keyed by a stable slug. The collection counts distinct
                  species ids, so repeat finds never duplicate a card.
     Outing       a visit to a place. Finds made while it's active attach to it.
     Saved place  a bookmark on any trail, fall-color spot or dark-sky site.
     Found trail  a snapshot of a trail from a live search (COTREX, USFS,
                  OSM) the person kept. Kept while anything points at it.
     Wildlife     a find can carry an iNaturalist taxon (birds, insects,
                  mammals) instead of a guide species. Keyed by taxon id.

   The CO Trail Atlas hiking log (co-trail-log-v1) is NOT copied in here: it
   stays the source of truth for hiked / rating / trip notes, read by the same
   key, so nothing about it has to migrate. */
export const ATLAS_KEY = "co-field-atlas-v1";
export const SCHEMA = 1;

export type ObsKind = "find" | "leafcheck";
export type IdMethod = "key" | "guide" | "none" | "import" | "photo" | "compare" | "search";

/** An iNaturalist taxon a wildlife find was named as. Identity is the id. */
export interface WildRef {
  id: number;
  name: string;
  common: string | null;
  iconic: string | null;
  /** threatened or location-obscured on iNaturalist: precise coordinates are never kept */
  sensitive: boolean;
}

/** A kept search result: enough to show, map and revisit it offline. */
export interface FoundSnapshot {
  id: string;
  name: string;
  manager: string | null;
  lat: number;
  lon: number;
  sub: string;
  mappedMi: number;
  elevMinFt: number | null;
  elevMaxFt: number | null;
  /** simplified [lat, lon] lines, at most a few hundred points */
  paths: [number, number][][];
  sources: { source: string; id: string }[];
  trailhead: { name: string; lat: number; lon: number } | null;
  updated: number | null;
  /** the source's short text attributes (surface, dogs, trail class…), as given */
  attrs: Record<string, string>;
  keptAt: string;
}

export interface Observation {
  id: string;
  kind: ObsKind;
  /** guide species id the user settled on; null = not identified yet */
  speciesId: string | null;
  /** ranked key suggestions at save time, so an open ID can be revisited */
  candidates: string[];
  idMethod: IdMethod;
  /** the key's strength for the chosen species, when it came from the key */
  keyStrength?: "strong" | "possible" | "weak";
  answers?: Record<string, string>;
  placeRef: PlaceRef | null;
  outingId: string | null;
  observedAt: string;
  note: string;
  photoId: string | null;
  thumb: string | null;
  /** only when the user chose to keep their location; never shared. approx = rounded to ~1 km */
  coords: { lat: number; lon: number; acc: number; approx?: boolean } | null;
  /** a wildlife identification (iNaturalist taxon), when it isn't a guide plant */
  taxon?: WildRef | null;
  /** how the photo recognizer rated the chosen taxon, when it came from there */
  photoLikelihood?: "likely" | "possible" | "unlikely";
  /** leaf checks (Leaf Hunter's report): estimated color at the spot */
  color?: { percent: number; status: "early" | "turning" | "peak" | "past" };
  /** where the record came from, for imports */
  source: "app" | "leaf-hunter";
}

export interface Outing {
  id: string;
  placeRef: PlaceRef | null;
  startedAt: string;
  endedAt: string | null;
  note: string;
}

export interface SavedPlace { ref: PlaceRef; savedAt: string }

export interface AtlasData {
  schema: number;
  observations: Observation[];
  outings: Outing[];
  saved: SavedPlace[];
  activeOutingId: string | null;
  found: FoundSnapshot[];
}

export const EMPTY_ATLAS: AtlasData = { schema: SCHEMA, observations: [], outings: [], saved: [], activeOutingId: null, found: [] };

/* ---- validation: stored data is untrusted (older builds, hand edits, imports) ---- */
const isStr = (v: unknown): v is string => typeof v === "string";
const isoOr = (v: unknown, fallback: string) => (isStr(v) && !Number.isNaN(Date.parse(v)) ? v : fallback);
const refOrNull = (v: unknown): PlaceRef | null => (isPlaceRef(v) ? v : null);

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function cleanWildRef(t: any): WildRef | null {
  if (!t || !Number.isInteger(t.id) || t.id <= 0 || !isStr(t.name)) return null;
  return { id: t.id, name: t.name, common: isStr(t.common) ? t.common : null, iconic: isStr(t.iconic) ? t.iconic : null, sensitive: t.sensitive === true };
}

function cleanFound(f: any): FoundSnapshot | null {
  if (!f || !isStr(f.id) || !isStr(f.name) || !isNum(f.lat) || !isNum(f.lon)) return null;
  const paths = (Array.isArray(f.paths) ? f.paths : [])
    .map((p: any) => (Array.isArray(p) ? p.filter((pt: any) => Array.isArray(pt) && isNum(pt[0]) && isNum(pt[1])).map((pt: number[]) => [pt[0], pt[1]] as [number, number]) : []))
    .filter((p: [number, number][]) => p.length >= 2);
  const th = f.trailhead && isStr(f.trailhead.name) && isNum(f.trailhead.lat) && isNum(f.trailhead.lon)
    ? { name: f.trailhead.name, lat: f.trailhead.lat, lon: f.trailhead.lon } : null;
  return {
    id: f.id, name: f.name, manager: isStr(f.manager) ? f.manager : null, lat: f.lat, lon: f.lon,
    sub: isStr(f.sub) ? f.sub : "", mappedMi: isNum(f.mappedMi) ? f.mappedMi : 0,
    elevMinFt: isNum(f.elevMinFt) ? f.elevMinFt : null, elevMaxFt: isNum(f.elevMaxFt) ? f.elevMaxFt : null,
    paths, sources: (Array.isArray(f.sources) ? f.sources : []).filter((x: any) => x && isStr(x.source) && isStr(x.id)).map((x: any) => ({ source: x.source, id: x.id })),
    trailhead: th, updated: isNum(f.updated) ? f.updated : null,
    attrs: Object.fromEntries(Object.entries(f.attrs && typeof f.attrs === "object" ? f.attrs : {})
      .filter(([k, v]) => /^[a-zA-Z]{1,20}$/.test(k) && isStr(v)).slice(0, 20).map(([k, v]) => [k, (v as string).slice(0, 120)])),
    keptAt: isoOr(f.keptAt, new Date(0).toISOString()),
  };
}

function cleanObservation(o: any): Observation | null {
  if (!o || !isStr(o.id)) return null;
  const speciesId = isStr(o.speciesId) && speciesById(o.speciesId) ? o.speciesId : null;
  const taxon = speciesId ? null : cleanWildRef(o.taxon);
  const coords = o.coords && typeof o.coords.lat === "number" && typeof o.coords.lon === "number" && !taxon?.sensitive
    ? { lat: o.coords.lat, lon: o.coords.lon, acc: typeof o.coords.acc === "number" ? o.coords.acc : 0, ...(o.coords.approx === true ? { approx: true } : {}) } : null;
  const color = o.color && typeof o.color.percent === "number" && ["early", "turning", "peak", "past"].includes(o.color.status)
    ? { percent: Math.max(0, Math.min(100, Math.round(o.color.percent))), status: o.color.status } : undefined;
  return {
    id: o.id,
    kind: o.kind === "leafcheck" ? "leafcheck" : "find",
    speciesId,
    candidates: Array.isArray(o.candidates) ? o.candidates.filter((c: unknown) => isStr(c) && speciesById(c)) : [],
    idMethod: ["key", "guide", "none", "import", "photo", "compare", "search"].includes(o.idMethod) ? o.idMethod : speciesId || taxon ? "guide" : "none",
    keyStrength: ["strong", "possible", "weak"].includes(o.keyStrength) ? o.keyStrength : undefined,
    answers: o.answers && typeof o.answers === "object" ? o.answers : undefined,
    placeRef: refOrNull(o.placeRef),
    outingId: isStr(o.outingId) ? o.outingId : null,
    observedAt: isoOr(o.observedAt, new Date(0).toISOString()),
    note: isStr(o.note) ? o.note : "",
    photoId: isStr(o.photoId) ? o.photoId : null,
    thumb: isStr(o.thumb) && o.thumb.startsWith("data:image/") ? o.thumb : null,
    coords,
    color,
    source: o.source === "leaf-hunter" ? "leaf-hunter" : "app",
    ...(taxon ? { taxon } : {}),
    ...(taxon && ["likely", "possible", "unlikely"].includes(o.photoLikelihood) ? { photoLikelihood: o.photoLikelihood } : {}),
  };
}

export function sanitize(raw: unknown): AtlasData {
  const d = raw as any;
  if (!d || typeof d !== "object") { registerFoundPlaces([]); return { ...EMPTY_ATLAS }; }
  /* found-trail snapshots first: refs to them must validate below */
  const foundSeen = new Set<string>();
  const foundAll = (Array.isArray(d.found) ? d.found : []).map(cleanFound)
    .filter((f: FoundSnapshot | null): f is FoundSnapshot => !!f && !foundSeen.has(f.id) && !!foundSeen.add(f.id));
  registerFoundPlaces(foundAll);
  const seen = new Set<string>();
  const observations = (Array.isArray(d.observations) ? d.observations : [])
    .map(cleanObservation)
    .filter((o: Observation | null): o is Observation => !!o && !seen.has(o.id) && !!seen.add(o.id));
  const outings: Outing[] = (Array.isArray(d.outings) ? d.outings : [])
    .filter((o: any) => o && isStr(o.id) && isStr(o.startedAt))
    .map((o: any) => ({
      id: o.id, placeRef: refOrNull(o.placeRef), startedAt: isoOr(o.startedAt, new Date(0).toISOString()),
      endedAt: isStr(o.endedAt) ? isoOr(o.endedAt, o.startedAt) : null, note: isStr(o.note) ? o.note : "",
    }));
  const outingIds = new Set(outings.map((o) => o.id));
  observations.forEach((o: Observation) => { if (o.outingId && !outingIds.has(o.outingId)) o.outingId = null; });
  const savedSeen = new Set<string>();
  const saved: SavedPlace[] = (Array.isArray(d.saved) ? d.saved : [])
    .filter((s: any) => s && isPlaceRef(s.ref) && !savedSeen.has(s.ref) && !!savedSeen.add(s.ref))
    .map((s: any) => ({ ref: s.ref, savedAt: isoOr(s.savedAt, new Date(0).toISOString()) }));
  const active = isStr(d.activeOutingId) && outings.some((o) => o.id === d.activeOutingId && !o.endedAt) ? d.activeOutingId : null;
  const found = pruneFound(foundAll, observations, outings, saved);
  registerFoundPlaces(found);
  return { schema: SCHEMA, observations, outings, saved, activeOutingId: active, found };
}

/** A snapshot stays while a save, find or outing points at it. */
function pruneFound(found: FoundSnapshot[], obs: Observation[], outings: Outing[], saved: SavedPlace[]): FoundSnapshot[] {
  const used = new Set<string>([...obs.map((o) => o.placeRef), ...outings.map((o) => o.placeRef), ...saved.map((s) => s.ref)].filter(Boolean) as string[]);
  return found.filter((f) => used.has(`found:${f.id}`));
}

/* ---- the store ---- */
let state: AtlasData = sanitize(loadKey(ATLAS_KEY));
const listeners = new Set<() => void>();

export const getAtlas = () => state;

function commit(next: AtlasData) {
  if (next.found !== state.found) registerFoundPlaces(next.found);
  state = next;
  saveKey(ATLAS_KEY, next);
  listeners.forEach((l) => l());
}

/** Re-read storage (tests, another tab, an import). */
export function reloadAtlas() {
  state = sanitize(loadKey(ATLAS_KEY));
  listeners.forEach((l) => l());
}

export function useAtlas(): AtlasData {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

export function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export type NewObservation = Omit<Observation, "id" | "source" | "outingId" | "observedAt"> & { observedAt?: string; outingId?: string | null };

/* A find made during an active outing joins it automatically, and takes its
   place when the user didn't pick one. */
export function addObservation(input: NewObservation): Observation {
  const active = state.outings.find((o) => o.id === state.activeOutingId && !o.endedAt) ?? null;
  const outingId = input.outingId !== undefined ? input.outingId : active?.id ?? null;
  const outing = state.outings.find((o) => o.id === outingId);
  const obs: Observation = {
    ...input,
    id: newId("obs"),
    source: "app",
    outingId,
    placeRef: input.placeRef ?? outing?.placeRef ?? null,
    observedAt: input.observedAt ?? new Date().toISOString(),
  };
  commit({ ...state, observations: [obs, ...state.observations] });
  return obs;
}

export function updateObservation(id: string, patch: Partial<Omit<Observation, "id">>) {
  commit({ ...state, observations: state.observations.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
}

export function removeObservation(id: string): Observation | undefined {
  const gone = state.observations.find((o) => o.id === id);
  const observations = state.observations.filter((o) => o.id !== id);
  commit({ ...state, observations, found: pruneFound(state.found, observations, state.outings, state.saved) });
  return gone;
}

export function startOuting(placeRef: PlaceRef | null): Outing {
  const now = new Date().toISOString();
  /* one active outing at a time: starting a new one ends the old */
  const outings = state.outings.map((o) => (o.id === state.activeOutingId && !o.endedAt ? { ...o, endedAt: now } : o));
  const outing: Outing = { id: newId("out"), placeRef, startedAt: now, endedAt: null, note: "" };
  commit({ ...state, outings: [outing, ...outings], activeOutingId: outing.id });
  return outing;
}

export function endOuting(id: string, note?: string) {
  const now = new Date().toISOString();
  commit({
    ...state,
    outings: state.outings.map((o) => (o.id === id ? { ...o, endedAt: o.endedAt ?? now, note: note ?? o.note } : o)),
    activeOutingId: state.activeOutingId === id ? null : state.activeOutingId,
  });
}

export function updateOuting(id: string, patch: Partial<Pick<Outing, "note" | "placeRef">>) {
  commit({ ...state, outings: state.outings.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
}

/** Deleting an outing keeps its finds; they just stop pointing at it. */
export function removeOuting(id: string) {
  const outings = state.outings.filter((o) => o.id !== id);
  const observations = state.observations.map((o) => (o.outingId === id ? { ...o, outingId: null } : o));
  commit({
    ...state,
    outings,
    observations,
    found: pruneFound(state.found, observations, outings, state.saved),
    activeOutingId: state.activeOutingId === id ? null : state.activeOutingId,
  });
}

export function toggleSaved(ref: PlaceRef) {
  const on = state.saved.some((s) => s.ref === ref);
  commit({
    ...state,
    saved: on ? state.saved.filter((s) => s.ref !== ref) : [{ ref, savedAt: new Date().toISOString() }, ...state.saved],
  });
}

/** Keep a search result so it can be saved or have finds logged at it. Returns its place ref. */
export function keepFound(snap: Omit<FoundSnapshot, "keptAt">): PlaceRef {
  const ref = `found:${snap.id}` as PlaceRef;
  if (!state.found.some((f) => f.id === snap.id)) {
    const clean = cleanFound({ ...snap, keptAt: new Date().toISOString() });
    if (clean) commit({ ...state, found: [clean, ...state.found] });
  }
  return ref;
}

/** Bookmark a search result (keeps its snapshot) or un-bookmark it. */
export function toggleSavedFound(snap: Omit<FoundSnapshot, "keptAt">) {
  const ref = keepFound(snap);
  toggleSaved(ref);
  if (!state.saved.some((s) => s.ref === ref)) commit({ ...state, found: pruneFound(state.found, state.observations, state.outings, state.saved) });
}

export const foundSnapshot = (d: AtlasData, id: string) => d.found.find((f) => f.id === id) ?? null;

export function replaceAtlas(next: AtlasData) {
  commit(sanitize(next));
}

/* ---- selectors ---- */
export const activeOuting = (d: AtlasData) => d.outings.find((o) => o.id === d.activeOutingId && !o.endedAt) ?? null;
export const isSaved = (d: AtlasData, ref: string) => d.saved.some((s) => s.ref === ref);

export interface SpeciesEntry { speciesId: string; count: number; first: string; last: string; obs: Observation[] }

export interface WildEntry { taxon: WildRef; count: number; first: string; last: string; obs: Observation[] }

/** One entry per iNaturalist taxon id: the same dedup rule as plants, for wildlife. */
export function wildCollection(d: AtlasData): WildEntry[] {
  const by = new Map<number, Observation[]>();
  d.observations.forEach((o) => { if (o.kind === "find" && o.taxon) by.set(o.taxon.id, [...(by.get(o.taxon.id) ?? []), o]); });
  return [...by.values()].map((obs) => {
    const times = obs.map((o) => o.observedAt).sort();
    return { taxon: obs[0].taxon!, count: obs.length, first: times[0], last: times[times.length - 1], obs };
  }).sort((a, b) => b.last.localeCompare(a.last));
}

/** One entry per species: the dedup rule the collection, quests and progress share. */
export function collection(d: AtlasData): SpeciesEntry[] {
  const by = new Map<string, Observation[]>();
  d.observations.forEach((o) => {
    if (o.kind === "find" && o.speciesId) by.set(o.speciesId, [...(by.get(o.speciesId) ?? []), o]);
  });
  return [...by.entries()].map(([speciesId, obs]) => {
    const times = obs.map((o) => o.observedAt).sort();
    return { speciesId, count: obs.length, first: times[0], last: times[times.length - 1], obs };
  }).sort((a, b) => b.last.localeCompare(a.last));
}

export const observationsAt = (d: AtlasData, ref: string) => d.observations.filter((o) => o.placeRef === ref);
export const observationsOf = (d: AtlasData, speciesId: string) => d.observations.filter((o) => o.speciesId === speciesId);
export const observationsOn = (d: AtlasData, outingId: string) => d.observations.filter((o) => o.outingId === outingId);
