import { useEffect, useRef, useState } from "react";
import { useAtlas } from "../lib/atlas";
import { LICENSE_TEXT, taxonUrl } from "../lib/inat";
import { currentMonth } from "../lib/season";
import { GROUP_CONDUCT, ICONIC_LABEL, fetchNearbyWildlife, fetchWildMonths, fetchWildTaxon } from "../lib/wildlife";
import type { WildSpecies, WildTaxon } from "../lib/wildlife";
import { WILD_GROUPS } from "../lib/vision";
import type { WildGroup } from "../lib/vision";
import { ObsRow, useActions } from "./PlaceSections";
import { Tag } from "./atlasBits";
import type { Loadable } from "./atlasBits";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function useWildNearby(lat: number | null, lon: number | null, group: WildGroup, month: number | null, radiusKm = 5): Loadable<WildSpecies[]> {
  const [v, setV] = useState<Loadable<WildSpecies[]>>({ state: "loading" });
  useEffect(() => {
    if (lat == null || lon == null) { setV({ state: "failed" }); return; }
    let live = true;
    setV({ state: "loading" });
    fetchNearbyWildlife(lat, lon, group, { radiusKm, month }).then((n) => { if (live) setV(n ? { state: "ok", value: n } : { state: "failed" }); });
    return () => { live = false; };
  }, [lat, lon, group, month, radiusKm]);
  return v;
}

export function useWildTaxon(id: number | null): Loadable<WildTaxon> {
  const [v, setV] = useState<Loadable<WildTaxon>>({ state: "loading" });
  useEffect(() => {
    if (!id) { setV({ state: "failed" }); return; }
    let live = true;
    setV({ state: "loading" });
    fetchWildTaxon(id).then((t) => { if (live) setV(t ? { state: "ok", value: t } : { state: "failed" }); });
    return () => { live = false; };
  }, [id]);
  return v;
}

export const groupTabLabel: Record<WildGroup, string> = { bird: "Birds", insect: "Insects & spiders", animal: "Mammals & more" };

/* What people have actually recorded near a trail: observed sightings, never "lives here". */
export function NearbyWildlife({ lat, lon, title = "Wildlife recorded nearby" }: { lat: number; lon: number; title?: string }) {
  const act = useActions();
  const [group, setGroup] = useState<WildGroup>("bird");
  const [anyMonth, setAnyMonth] = useState(false);
  const month = currentMonth();
  const near = useWildNearby(lat, lon, group, anyMonth ? null : month);
  const window = `${MONTH_LONG[(month + 10) % 12]} to ${MONTH_LONG[month % 12]}`;
  return (
    <section className="det-sec" aria-label={title}>
      <h3>{title} <Tag p="inat" /></h3>
      <div className="seg" role="tablist" aria-label="Kind of wildlife">
        {WILD_GROUPS.map((g) => (
          <button key={g.key} type="button" role="tab" aria-selected={group === g.key} className={"seg-btn" + (group === g.key ? " on" : "")}
            onClick={() => setGroup(g.key)}>{groupTabLabel[g.key]}</button>
        ))}
      </div>
      <p className="quiet small">
        Species with research-grade iNaturalist sightings within 5 km, {anyMonth ? "in any month" : window}. These were seen here;
        it isn't a list of everything that lives here. iNaturalist blurs the locations of sensitive species.
      </p>
      <label className="check small-check">
        <input type="checkbox" checked={anyMonth} onChange={(e) => setAnyMonth(e.target.checked)} />
        <span>Any time of year</span>
      </label>
      {near.state === "loading" && <p className="quiet">Loading sightings…</p>}
      {near.state === "failed" && <p className="quiet">Couldn't reach iNaturalist. This fills in when you're online.</p>}
      {near.state === "ok" && (near.value.length ? (
        <ul className="near-list">
          {near.value.slice(0, 12).map((n) => (
            <li key={n.taxonId}>
              <button type="button" className="near-row" onClick={() => act.openTaxon(n.taxonId)}>
                <WildArt photo={n.photo} className="near-art" />
                <span className="near-text"><b>{n.common ?? n.name}</b><i>{n.name}</i></span>
                <span className="near-n">{n.count}<small>{n.count === 1 ? "sighting" : "sightings"}</small></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="quiet">No research-grade {groupTabLabel[group].toLowerCase()} sightings this close{anyMonth ? "" : " at this time of year"} yet.</p>)}
    </section>
  );
}

/* iNaturalist photos are CC licensed: the square thumbnail goes in lists, the credit is on the species page. */
export function WildArt({ photo, thumb, className }: { photo: WildSpecies["photo"]; thumb?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = thumb ?? (photo && !broken ? photo.square : null);
  return src
    ? <img className={"art art-photo " + (className ?? "")} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
    : <span className={"art art-glyph wild-glyph " + (className ?? "")} aria-hidden="true"><TrackGlyph /></span>;
}

/* A set of three-toed tracks, for wildlife without a picture yet. */
export function TrackGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%">
      {[[12, 26], [26, 14]].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M0,6 L0,-3 M0,1 L-5,-4 M0,1 L5,-4" />
        </g>
      ))}
    </svg>
  );
}

/* ================= WILDLIFE SPECIES PAGE ================= */
export function TaxonPage({ id, near, onClose }: { id: number; near: { lat: number; lon: number; label: string } | null; onClose: () => void }) {
  const act = useActions();
  const d = useAtlas();
  const t = useWildTaxon(id);
  const ref = useRef<HTMLButtonElement>(null);
  const [months, setMonths] = useState<Loadable<{ months: number[]; where: "near" | "colorado" }>>({ state: "loading" });
  const mine = d.observations.filter((o) => o.taxon?.id === id);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [id]);
  useEffect(() => {
    let live = true;
    setMonths({ state: "loading" });
    fetchWildMonths(id, near).then((m) => { if (live) setMonths(m ? { state: "ok", value: m } : { state: "failed" }); });
    return () => { live = false; };
  }, [id, near?.lat, near?.lon]);

  const name = t.state === "ok" ? t.value.common ?? t.value.name : "Species";
  const max = months.state === "ok" ? Math.max(1, ...months.value.months) : 1;
  const month = currentMonth();
  return (
    <article className="det" aria-label={`${name} species page`}>
      <div className="det-bar">
        <button ref={ref} type="button" className="det-close" onClick={onClose} aria-label={`Close ${name} species page`}>
          <span aria-hidden="true">←</span> Back
        </button>
      </div>
      <figure className="sp-hero">
        {t.state === "ok" && t.value.photo ? (
          <>
            <img src={t.value.photo.medium} alt={`${name}, photographed by an iNaturalist observer`} />
            <figcaption>{t.value.photo.attribution} · {LICENSE_TEXT(t.value.photo.license)} · via iNaturalist</figcaption>
          </>
        ) : (
          <span className="sp-hero-glyph wild-glyph"><TrackGlyph /><small>{t.state === "loading" ? "Loading photo…" : "Photo loads from iNaturalist when you're online"}</small></span>
        )}
      </figure>
      {t.state === "failed" && <p className="notice">Couldn't load this species from iNaturalist. Check your connection and open it again.</p>}
      {t.state === "ok" && <>
        <header className="sp-head">
          <div className="det-eyebrow">{(ICONIC_LABEL[t.value.iconic ?? ""] ?? t.value.iconic ?? "Wildlife").toUpperCase()} · {t.value.rank.toUpperCase()}</div>
          <h2 className="det-name">{name}</h2>
          <i className="sp-sci">{t.value.name}</i>
        </header>
        {t.value.sensitive && (
          <p className="sensitive-note">Listed as sensitive or at risk. Keep sightings to yourself, give it extra room, and never share a precise location. This app won't save coordinates for it.</p>
        )}
        {t.value.summary && (
          <section className="det-sec">
            <h3>About <Tag p="inat">Wikipedia via iNaturalist</Tag></h3>
            <p>{t.value.summary}</p>
          </section>
        )}
        <section className="det-sec" aria-label="When it's recorded">
          <h3>When it's seen <Tag p="inat" /></h3>
          {months.state === "loading" && <p className="quiet">Loading records…</p>}
          {months.state === "failed" && <p className="quiet">Couldn't load monthly records.</p>}
          {months.state === "ok" && (months.value.months.some((n) => n > 0) ? <>
            <div className="mbars" role="img" aria-label={`Research-grade records by month ${months.value.where === "near" ? `within 50 km of ${near?.label}` : "in Colorado"}`}>
              {months.value.months.map((n, i) => (
                <span key={i} className={"mbar" + (i + 1 === month ? " now" : "")}>
                  <i style={{ height: `${Math.max(n ? 6 : 0, (n / max) * 100)}%` }} />
                  <small>{MONTHS[i]}</small>
                </span>
              ))}
            </div>
            <p className="quiet small">Research-grade iNaturalist records by month {months.value.where === "near" ? `within 50 km of ${near?.label}` : "in Colorado"}. More records can mean more observers out that month, not more animals.</p>
          </> : <p className="quiet">No research-grade records {months.value.where === "near" ? "within 50 km of here" : "in Colorado"} yet.</p>)}
        </section>
        {!!t.value.statuses.length && (
          <section className="det-sec">
            <h3>Conservation status <Tag p="inat" /></h3>
            <ul className="status-list">
              {t.value.statuses.slice(0, 5).map((s, i) => (
                <li key={i}><b>{s.statusName ?? s.status}</b> <span className="quiet small">{[s.authority, s.place].filter(Boolean).join(" · ")}</span></li>
              ))}
            </ul>
          </section>
        )}
        {t.value.iconic && GROUP_CONDUCT[t.value.iconic] && (
          <section className="det-sec">
            <h3>Watching it <Tag p="reference" /></h3>
            <p>{GROUP_CONDUCT[t.value.iconic]}</p>
          </section>
        )}
      </>}
      <section className="det-sec">
        <h3>Your sightings <Tag p="yours" /></h3>
        {mine.length ? <ul className="obs-list">{mine.map((o) => <ObsRow key={o.id} o={o} />)}</ul>
          : <p className="quiet">None yet. Photograph one in Nature ID and it lands in your journal.</p>}
      </section>
      <section className="det-sec sources">
        <h3>Look it up</h3>
        <p>
          <a href={taxonUrl(id)} target="_blank" rel="noreferrer">iNaturalist species page</a>
          {t.state === "ok" && t.value.wikipediaUrl && <> · <a href={t.value.wikipediaUrl} target="_blank" rel="noreferrer">Wikipedia</a></>}
        </p>
        {t.state === "ok" && <p className="quiet small">{t.value.observations.toLocaleString()} observations on iNaturalist worldwide.</p>}
      </section>
      <div className="det-cta">
        <button type="button" className="dir-btn" onClick={() => act.identifyAt(null)}>Log a sighting</button>
      </div>
    </article>
  );
}
