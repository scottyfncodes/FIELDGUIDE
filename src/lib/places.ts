import { AREAS } from "../data/areas";
import { TRAILS } from "../data/trails";
import { COLORADO_LOCATIONS } from "../data/foliage";
import { SITES } from "../data/darksky";

/* ---------- PLACES ----------
   One index over the three place catalogs the merged app inherited:
     trail:<id>   CO Trail Atlas trails (trailhead coordinates)
     color:<id>   Leaf Hunter fall-color spots
     sky:<id>     LOOKUP dark-sky sites
     found:<id>   a trail from a live search the person kept (saved it, or
                  logged a find there). Its snapshot lives in the atlas store
                  and is registered here at load, so refs survive a reload.
   A PlaceRef is the stable identifier observations, outings and saves point
   at. The ids are the originals from each app, so nothing needs remapping. */
export type PlaceKind = "trail" | "color" | "sky" | "found";
export type PlaceRef = `${PlaceKind}:${string}`;

export interface Place {
  ref: PlaceRef;
  kind: PlaceKind;
  id: string;
  name: string;
  /** area / town line under the name */
  sub: string;
  lat: number;
  lon: number;
}

export const KIND_LABEL: Record<PlaceKind, string> = {
  trail: "Trail",
  color: "Fall color spot",
  sky: "Dark-sky site",
  found: "Trail",
};

export const PLACES: Place[] = [
  ...TRAILS.map((t): Place => ({
    ref: `trail:${t.id}`, kind: "trail", id: t.id, name: t.name, sub: AREAS[t.area]?.label ?? "", lat: t.lat, lon: t.lon,
  })),
  ...COLORADO_LOCATIONS.map((l): Place => ({
    ref: `color:${l.id}`, kind: "color", id: l.id, name: l.name, sub: `${l.town} · ${l.area}`, lat: l.latitude, lon: l.longitude,
  })),
  ...SITES.map((s): Place => ({
    ref: `sky:${s.id}`, kind: "sky", id: s.id, name: s.name, sub: s.region, lat: s.lat, lon: s.lon,
  })),
];

const BY_REF = new Map(PLACES.map((p) => [p.ref, p]));
const FOUND = new Map<PlaceRef, Place>();

/** The atlas store calls this whenever its found-trail snapshots change. */
export function registerFoundPlaces(list: { id: string; name: string; sub: string; lat: number; lon: number }[]) {
  FOUND.clear();
  list.forEach((f) => FOUND.set(`found:${f.id}`, { ref: `found:${f.id}`, kind: "found", id: f.id, name: f.name, sub: f.sub, lat: f.lat, lon: f.lon }));
}
export const foundPlaces = () => [...FOUND.values()];

export const placeByRef = (ref: string | null | undefined): Place | undefined =>
  ref ? BY_REF.get(ref as PlaceRef) ?? FOUND.get(ref as PlaceRef) : undefined;

export const isPlaceRef = (s: unknown): s is PlaceRef => typeof s === "string" && (BY_REF.has(s as PlaceRef) || FOUND.has(s as PlaceRef));

export function nearestPlaces(lat: number, lon: number, n = 5): { place: Place; mi: number }[] {
  const R = 3958.8, d = Math.PI / 180;
  const dist = (p: Place) => {
    const s = Math.sin(((p.lat - lat) * d) / 2) ** 2 +
      Math.cos(lat * d) * Math.cos(p.lat * d) * Math.sin(((p.lon - lon) * d) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  return [...PLACES, ...FOUND.values()].map((place) => ({ place, mi: dist(place) })).sort((a, b) => a.mi - b.mi).slice(0, n);
}
