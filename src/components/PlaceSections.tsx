import { createContext, useContext } from "react";
import { SPECIES, speciesById } from "../data/species";
import type { Place, PlaceRef } from "../lib/places";
import {
  activeOuting, endOuting, isSaved, observationsAt, startOuting, toggleSaved, useAtlas,
} from "../lib/atlas";
import type { Observation } from "../lib/atlas";
import { taxonUrl } from "../lib/inat";
import { SpeciesArt, Tag, fmtDate, fmtDuration, useNearby } from "./atlasBits";
import { placeByRef } from "../lib/places";

/* App-level actions any screen or sheet can call (wired up in App.tsx). */
export interface Actions {
  openSpecies: (id: string) => void;
  /** a wildlife species page, by iNaturalist taxon id */
  openTaxon: (id: number) => void;
  /** a trail from the live search (or a kept one) */
  openFound: (id: string) => void;
  openObs: (id: string) => void;
  openPlace: (ref: string) => void;
  openOuting: (id: string) => void;
  openGuide: () => void;
  identifyAt: (ref: PlaceRef | null) => void;
  /** a Safety & Survival view, e.g. { topic: "weather" } or { flow: "lost" } */
  openSafety: (params: Record<string, string>) => void;
  /** called when an outing at a trail ends, so the hiking log can be updated */
  onOutingEnded: (ref: PlaceRef | null, markHiked: boolean) => void;
  toast: (msg: string) => void;
}
export const ActionsCtx = createContext<Actions | null>(null);
export function useActions(): Actions {
  const a = useContext(ActionsCtx);
  if (!a) throw new Error("ActionsCtx missing");
  return a;
}

const BY_INAT = new Map(SPECIES.map((s) => [s.inat, s]));

/* Save · start/end outing · log a find */
export function PlaceActions({ place, hiked }: { place: Place; hiked?: boolean }) {
  const d = useAtlas();
  const act = useActions();
  const saved = isSaved(d, place.ref);
  const out = activeOuting(d);
  const here = out?.placeRef === place.ref;
  return (
    <div className="place-actions">
      <button type="button" className={"pa-btn" + (saved ? " on" : "")} aria-pressed={saved} onClick={() => toggleSaved(place.ref)}>
        {saved ? "Saved" : "Save place"}
      </button>
      {here ? (
        <button type="button" className="pa-btn pa-end" onClick={() => {
          endOuting(out!.id);
          act.onOutingEnded(place.ref, place.kind === "trail" && !hiked);
        }}>
          End outing <small>{fmtDuration(out!.startedAt, null)}</small>
        </button>
      ) : (
        <button type="button" className="pa-btn" onClick={() => { startOuting(place.ref); act.toast(`Outing started at ${place.name}`); }}>
          {out ? "Start outing here" : "I'm here: start outing"}
        </button>
      )}
      <button type="button" className="pa-btn pa-primary" onClick={() => act.identifyAt(place.ref)}>Log a find here</button>
    </div>
  );
}

export function ObsRow({ o, showPlace = true }: { o: Observation; showPlace?: boolean }) {
  const act = useActions();
  const s = speciesById(o.speciesId);
  const place = placeByRef(o.placeRef);
  const title = o.kind === "leafcheck" ? `Leaf check · ${o.color?.percent ?? 0}% color` : s ? s.common : o.taxon ? o.taxon.common ?? o.taxon.name : "Not identified yet";
  return (
    <li className="obs-row">
      <button type="button" className="obs-main" onClick={() => act.openObs(o.id)}>
        {s ? <SpeciesArt s={s} thumb={o.thumb} className="obs-art" />
          : o.thumb ? <img className="art art-photo obs-art" src={o.thumb} alt="" />
          : <span className="art art-glyph obs-art obs-unknown" aria-hidden="true">?</span>}
        <span className="obs-text">
          <span className="obs-title">{title}</span>
          <span className="obs-meta">
            {fmtDate(o.observedAt)}{showPlace && place ? ` · ${place.name}` : ""}
          </span>
        </span>
      </button>
    </li>
  );
}

export function YourFinds({ place }: { place: Place }) {
  const d = useAtlas();
  const act = useActions();
  const obs = observationsAt(d, place.ref);
  const outings = d.outings.filter((o) => o.placeRef === place.ref);
  return (
    <section className="det-sec" aria-label="Your finds here">
      <h3>Your finds here <Tag p="yours" /></h3>
      {obs.length ? (
        <ul className="obs-list">{obs.map((o) => <ObsRow key={o.id} o={o} showPlace={false} />)}</ul>
      ) : (
        <p className="quiet">Nothing logged here yet. Photograph a leaf or flower and it lands in your atlas, tied to this place.</p>
      )}
      {!!outings.length && (
        <p className="quiet">
          {outings.length} outing{outings.length === 1 ? "" : "s"} here, last{" "}
          <button type="button" className="linkish" onClick={() => act.openOuting(outings[0].id)}>{fmtDate(outings[0].startedAt)}</button>
        </p>
      )}
    </section>
  );
}

/* What iNaturalist users have recorded near here. Guide species are matched
   by iNaturalist taxon id, never by name. */
export function NearbyNature({ place }: { place: Place }) {
  const act = useActions();
  const near = useNearby(place.lat, place.lon);
  return (
    <section className="det-sec" aria-label="Recorded nearby">
      <h3>Recorded nearby <Tag p="inat" /></h3>
      <p className="quiet small">Plant species with research-grade iNaturalist records within 3 km of this point, most recorded first.</p>
      {near.state === "loading" && <p className="quiet">Loading records…</p>}
      {near.state === "failed" && <p className="quiet">Couldn't reach iNaturalist. This fills in when you're online.</p>}
      {near.state === "ok" && (near.value.length ? (
        <ul className="near-list">
          {near.value.slice(0, 12).map((n) => {
            const g = BY_INAT.get(n.taxonId);
            return (
              <li key={n.taxonId}>
                {g ? (
                  <button type="button" className="near-row near-guide" onClick={() => act.openSpecies(g.id)}>
                    <SpeciesArt s={g} className="near-art" />
                    <span className="near-text"><b>{g.common}</b><i>{n.name}</i></span>
                    <span className="near-n">{n.count}<small>records</small></span>
                    <span className="near-tag">In guide</span>
                  </button>
                ) : (
                  <a className="near-row" href={taxonUrl(n.taxonId)} target="_blank" rel="noreferrer">
                    {/* no uncredited photos: iNaturalist images are CC licensed and need their credit line */}
                    <span className="art near-art near-out" aria-hidden="true" />
                    <span className="near-text"><b>{n.common ?? n.name}</b><i>{n.name}</i></span>
                    <span className="near-n">{n.count}<small>records</small></span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="quiet">No research-grade plant records this close yet.</p>)}
    </section>
  );
}
