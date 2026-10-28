import { useSyncExternalStore } from "react";
import { speciesById } from "../data/species";
import { isPlaceRef } from "./places";
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

   The CO Trail Atlas hiking log (co-trail-log-v1) is NOT copied in here: it
   stays the source of truth for hiked / rating / trip notes, read by the same
   key, so nothing about it has to migrate. */
export const ATLAS_KEY = "co-field-atlas-v1";
export const SCHEMA = 1;

export type ObsKind = "find" | "leafcheck";
export type IdMethod = "key" | "guide" | "none" | "import";

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
  /** only when the user tapped "add my location"; never shared */
  coords: { lat: number; lon: number; acc: number } | null;
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
}

export const EMPTY_ATLAS: AtlasData = { schema: SCHEMA, observations: [], outings: [], saved: [], activeOutingId: null };

/* ---- validation: stored data is untrusted (older builds, hand edits, imports) ---- */
const isStr = (v: unknown): v is string => typeof v === "string";
const isoOr = (v: unknown, fallback: string) => (isStr(v) && !Number.isNaN(Date.parse(v)) ? v : fallback);
const refOrNull = (v: unknown): PlaceRef | null => (isPlaceRef(v) ? v : null);

function cleanObservation(o: any): Observation | null {
  if (!o || !isStr(o.id)) return null;
  const speciesId = isStr(o.speciesId) && speciesById(o.speciesId) ? o.speciesId : null;
  const coords = o.coords && typeof o.coords.lat === "number" && typeof o.coords.lon === "number"
    ? { lat: o.coords.lat, lon: o.coords.lon, acc: typeof o.coords.acc === "number" ? o.coords.acc : 0 } : null;
  const color = o.color && typeof o.color.percent === "number" && ["early", "turning", "peak", "past"].includes(o.color.status)
    ? { percent: Math.max(0, Math.min(100, Math.round(o.color.percent))), status: o.color.status } : undefined;
  return {
    id: o.id,
    kind: o.kind === "leafcheck" ? "leafcheck" : "find",
    speciesId,
    candidates: Array.isArray(o.candidates) ? o.candidates.filter((c: unknown) => isStr(c) && speciesById(c)) : [],
    idMethod: ["key", "guide", "none", "import"].includes(o.idMethod) ? o.idMethod : speciesId ? "guide" : "none",
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
  };
}

export function sanitize(raw: unknown): AtlasData {
  const d = raw as any;
  if (!d || typeof d !== "object") return { ...EMPTY_ATLAS };
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
  return { schema: SCHEMA, observations, outings, saved, activeOutingId: active };
}

/* ---- the store ---- */
let state: AtlasData = sanitize(loadKey(ATLAS_KEY));
const listeners = new Set<() => void>();

export const getAtlas = () => state;

function commit(next: AtlasData) {
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
  commit({ ...state, observations: state.observations.filter((o) => o.id !== id) });
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
  commit({
    ...state,
    outings: state.outings.filter((o) => o.id !== id),
    observations: state.observations.map((o) => (o.outingId === id ? { ...o, outingId: null } : o)),
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

export function replaceAtlas(next: AtlasData) {
  commit(sanitize(next));
}

/* ---- selectors ---- */
export const activeOuting = (d: AtlasData) => d.outings.find((o) => o.id === d.activeOutingId && !o.endedAt) ?? null;
export const isSaved = (d: AtlasData, ref: string) => d.saved.some((s) => s.ref === ref);

export interface SpeciesEntry { speciesId: string; count: number; first: string; last: string; obs: Observation[] }

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
