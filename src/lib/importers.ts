import { COLORADO_LOCATIONS } from "../data/foliage";
import { SITES } from "../data/darksky";
import type { AtlasData, Observation } from "./atlas";
import { sanitize } from "./atlas";
import type { PlaceRef } from "./places";

/* ---------- IMPORTS FROM THE ORIGINAL APPS ----------
   Each original app keeps its data in its own browser origin, so the merged
   app can't read it directly. These take the JSON the user exports there and
   merge it in. Rules, all covered by tests:
     - Idempotent: imported records get ids derived from the source ids
       (lh-<report id>), so importing the same file twice adds nothing.
     - Additive: nothing already in the atlas is changed or removed.
     - Only known places: references to ids that don't exist here are skipped
       and counted, never guessed at.

   CO Trail Atlas needs no import: the merged app reads its hiking log from
   the same localStorage key on the same production domain. */

export interface ImportResult {
  data: AtlasData;
  added: { observations: number; saved: number };
  skipped: { duplicates: number; unknownPlaces: number; unsupported: string[] };
  /** photos to move into the photo store: observation id -> data URL */
  photos: { obsId: string; dataUrl: string }[];
}

const COLOR_IDS = new Set(COLORADO_LOCATIONS.map((l) => l.id));
const SKY_IDS = new Set(SITES.map((s) => s.id));
const STATUSES = ["early", "turning", "peak", "past"] as const;

/** Leaf Hunter: { app: "leaf-hunter", reports: FoliageReport[], favorites: FavoriteSnapshot[] } */
export function importLeafHunter(current: AtlasData, raw: unknown): ImportResult {
  const src = raw as any;
  const res = emptyResult(current);
  const have = new Set(current.observations.map((o) => o.id));
  const reports: any[] = Array.isArray(src?.reports) ? src.reports : [];
  const fresh: Observation[] = [];
  for (const r of reports) {
    if (!r || typeof r.id !== "string" || r.source === "demo") continue; // demo reports were never observations
    const id = `lh-${r.id}`;
    if (have.has(id)) { res.skipped.duplicates++; continue; }
    if (!COLOR_IDS.has(r.locationId)) { res.skipped.unknownPlaces++; continue; }
    const status = STATUSES.includes(r.status) ? r.status : "turning";
    const hasPhoto = typeof r.photo === "string" && r.photo.startsWith("data:image/");
    fresh.push({
      id, kind: "leafcheck", speciesId: null, candidates: [], idMethod: "import",
      placeRef: `color:${r.locationId}` as PlaceRef, outingId: null,
      observedAt: typeof r.observedAt === "string" ? r.observedAt : new Date().toISOString(),
      note: typeof r.note === "string" ? r.note : "",
      photoId: hasPhoto ? `photo-${id}` : null, thumb: null, coords: null,
      color: { percent: Number(r.colorPercent) || 0, status }, source: "leaf-hunter",
    });
    if (hasPhoto) res.photos.push({ obsId: id, dataUrl: r.photo });
    have.add(id);
  }
  const favs: any[] = Array.isArray(src?.favorites) ? src.favorites : [];
  const saved = [...current.saved];
  for (const f of favs) {
    if (!f || !COLOR_IDS.has(f.locationId)) { res.skipped.unknownPlaces++; continue; }
    const ref = `color:${f.locationId}` as PlaceRef;
    if (saved.some((s) => s.ref === ref)) { res.skipped.duplicates++; continue; }
    saved.push({ ref, savedAt: typeof f.addedAt === "string" ? f.addedAt : new Date().toISOString() });
    res.added.saved++;
  }
  res.added.observations = fresh.length;
  res.data = sanitize({ ...current, observations: [...fresh, ...current.observations], saved });
  return res;
}

/** LOOKUP: its More > Export JSON (the Prefs object). */
export function importLookup(current: AtlasData, raw: unknown): ImportResult {
  const p = raw as any;
  const res = emptyResult(current);
  const saved = [...current.saved];
  const want = new Set<string>();
  if (typeof p?.selectedSiteId === "string") want.add(p.selectedSiteId);
  for (const id of want) {
    if (!SKY_IDS.has(id)) { res.skipped.unknownPlaces++; continue; }
    const ref = `sky:${id}` as PlaceRef;
    if (saved.some((s) => s.ref === ref)) { res.skipped.duplicates++; continue; }
    saved.push({ ref, savedAt: new Date().toISOString() });
    res.added.saved++;
  }
  const custom = Array.isArray(p?.customSites) ? p.customSites.length : 0;
  if (custom) res.skipped.unsupported.push(`${custom} custom site${custom === 1 ? "" : "s"} (custom places aren't supported yet)`);
  res.data = sanitize({ ...current, saved });
  return res;
}

/** Sniff which app a file came from. */
export function detectSource(raw: unknown): "leaf-hunter" | "lookup" | "atlas" | null {
  const d = raw as any;
  if (!d || typeof d !== "object") return null;
  if (d.app === "leaf-hunter" || (Array.isArray(d.reports) && Array.isArray(d.favorites))) return "leaf-hunter";
  if (d.app === "co-field-atlas" || Array.isArray(d.observations)) return "atlas";
  if ("maxDriveMinutes" in d || "customSites" in d || "redMode" in d) return "lookup";
  return null;
}

function emptyResult(current: AtlasData): ImportResult {
  return { data: current, added: { observations: 0, saved: 0 }, skipped: { duplicates: 0, unknownPlaces: 0, unsupported: [] }, photos: [] };
}
