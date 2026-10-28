import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Species } from "../data/species";
import { fetchNearby, fetchTaxon } from "../lib/inat";
import type { InatTaxon, NearbySpecies } from "../lib/inat";
import { getPhoto } from "../lib/photos";
import { LeafGlyph } from "./Glyphs";

/* ---------- PROVENANCE ----------
   The rule carried over from LOOKUP: every claim says what kind of claim it
   is. Reference (the field guide), yours (your own records), suggestion (the
   key), estimate (a model), computed (astronomy), iNaturalist (live records). */
export type Prov = "reference" | "yours" | "suggestion" | "estimate" | "computed" | "inat";
const PROV_TEXT: Record<Prov, string> = {
  reference: "Field guide",
  yours: "Your record",
  suggestion: "Suggestion",
  estimate: "Estimate",
  computed: "Computed",
  inat: "iNaturalist",
};
export function Tag({ p, children }: { p: Prov; children?: ReactNode }) {
  return <span className={"prov prov-" + p}>{children ?? PROV_TEXT[p]}</span>;
}

/* ---------- hooks over the network bits; each says when it's loading or failed ---------- */
export type Loadable<T> = { state: "loading" } | { state: "ok"; value: T } | { state: "failed" };

export function useTaxon(id: number | undefined): Loadable<InatTaxon> {
  const [v, setV] = useState<Loadable<InatTaxon>>({ state: "loading" });
  useEffect(() => {
    if (!id) { setV({ state: "failed" }); return; }
    let live = true;
    setV({ state: "loading" });
    fetchTaxon(id).then((t) => { if (live) setV(t ? { state: "ok", value: t } : { state: "failed" }); });
    return () => { live = false; };
  }, [id]);
  return v;
}

export function useNearby(lat: number, lon: number, enabled = true): Loadable<NearbySpecies[]> {
  const [v, setV] = useState<Loadable<NearbySpecies[]>>({ state: "loading" });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setV({ state: "loading" });
    fetchNearby(lat, lon).then((n) => { if (live) setV(n ? { state: "ok", value: n } : { state: "failed" }); });
    return () => { live = false; };
  }, [lat, lon, enabled]);
  return v;
}

/** The full-size photo from IndexedDB, falling back to the inline thumbnail. */
export function usePhotoUrl(photoId: string | null, thumb: string | null): string | null {
  const [url, setUrl] = useState<string | null>(thumb);
  useEffect(() => {
    setUrl(thumb);
    if (!photoId) return;
    let live = true, made: string | null = null;
    getPhoto(photoId).then((b) => {
      if (!live || !b) return;
      made = URL.createObjectURL(b);
      setUrl(made);
    });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [photoId, thumb]);
  return url;
}

/* A species picture: your own photo first, then the drawn leaf. (Network
   photos are only used on the species page itself, where they're credited.) */
export function SpeciesArt({ s, thumb, className }: { s: Species; thumb?: string | null; className?: string }) {
  if (thumb) return <img className={"art art-photo " + (className ?? "")} src={thumb} alt="" />;
  return <span className={"art art-glyph " + (className ?? "")}><LeafGlyph shape={s.leaf} /></span>;
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Denver", ...opts });

export function fmtDuration(fromIso: string, toIso: string | null, now = Date.now()) {
  const min = Math.max(0, Math.round(((toIso ? Date.parse(toIso) : now) - Date.parse(fromIso)) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/* Toast: one short status line, announced politely */
export function Toast({ msg }: { msg: string | null }) {
  return <div className={"toast" + (msg ? " on" : "")} role="status" aria-live="polite">{msg}</div>;
}
