import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { GROUP_LABEL, LEAF_LABEL, SPECIES, ZONE_LABEL, speciesById } from "../data/species";
import type { Group, Species } from "../data/species";
import { COLORADO_LOCATIONS } from "../data/foliage";
import {
  activeOuting, collection, endOuting, observationsOf, observationsOn, removeObservation, removeOuting,
  updateObservation, updateOuting, useAtlas,
} from "../lib/atlas";
import { deletePhoto } from "../lib/photos";
import { placeByRef } from "../lib/places";
import { fetchMonths, LICENSE_TEXT, taxonUrl } from "../lib/inat";
import { STATUS_META, deriveCondition } from "../lib/foliage/foliage";
import { currentMonth } from "../lib/season";
import { STRENGTH_TEXT } from "../lib/identify";
import { leafReports } from "./PlaceDetail";
import { ObsRow, useActions } from "./PlaceSections";
import { SpeciesArt, Tag, fmtDate, fmtDuration, usePhotoUrl, useTaxon } from "./atlasBits";
import { LeafGlyph } from "./Glyphs";
import { searchWildTaxa, fetchWildTaxon } from "../lib/wildlife";
import type { WildSpecies } from "../lib/wildlife";
import type { Observation } from "../lib/atlas";
import { WildArt } from "./Wildlife";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function SheetFrame({ label, onClose, children, actions }: { label: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [label]);
  return (
    <article className="det" aria-label={label}>
      <div className="det-bar">
        <button ref={ref} type="button" className="det-close" onClick={onClose} aria-label={`Close ${label}`}>
          <span aria-hidden="true">←</span> Back
        </button>
        {actions && <div className="det-bar-actions">{actions}</div>}
      </div>
      {children}
    </article>
  );
}

/* ================= SPECIES PAGE ================= */
export function SpeciesPage({ s, onClose }: { s: Species; onClose: () => void }) {
  const act = useActions();
  const d = useAtlas();
  const taxon = useTaxon(s.inat);
  const mine = observationsOf(d, s.id);
  const month = currentMonth();
  const lookNow = s.look.filter((l) => l.months.includes(month));
  return (
    <SheetFrame label={`${s.common} field guide entry`} onClose={onClose}>
      <figure className="sp-hero">
        {taxon.state === "ok" && taxon.value.photo ? (
          <>
            <img src={taxon.value.photo.medium} alt={`${s.common}, photographed by an iNaturalist observer`} />
            <figcaption>{taxon.value.photo.attribution} · {LICENSE_TEXT(taxon.value.photo.license)} · via iNaturalist</figcaption>
          </>
        ) : (
          <span className="sp-hero-glyph"><LeafGlyph shape={s.leaf} /><small>{taxon.state === "loading" ? "Loading photo…" : "Photo loads from iNaturalist when you're online"}</small></span>
        )}
      </figure>
      <header className="sp-head">
        <div className="det-eyebrow">{GROUP_LABEL[s.groups[0]].toUpperCase()} · {s.family.toUpperCase()}</div>
        <h2 className="det-name">{s.common}</h2>
        <div className="sp-sci"><i>{s.sci}</i>{s.rank !== "species" && <span className="sp-rank">{s.rank === "genus" ? "genus-level entry" : "species complex"}</span>}</div>
        <div className="sp-mine">
          {mine.length ? <><Tag p="yours" /> Found {mine.length} time{mine.length === 1 ? "" : "s"}, first {fmtDate(mine[mine.length - 1].observedAt)}</>
            : <span className="quiet">Not in your atlas yet.</span>}
        </div>
        <button type="button" className="pa-btn pa-primary" onClick={() => act.identifyAt(null)}>Log a find</button>
      </header>

      {s.caution && <p className="caution">{s.caution}</p>}

      <section className="det-sec">
        <h3>How to know it <Tag p="reference" /></h3>
        <ul className="ticks">{s.idMarks.map((m) => <li key={m}>{m}</li>)}</ul>
        <p className="quiet small">Leaf shape on the card: {LEAF_LABEL[s.leaf].toLowerCase()}.</p>
      </section>

      <section className="det-sec">
        <h3>Where and when <Tag p="reference" /></h3>
        <div className="kv">
          <div><span>Habitat</span><b>{s.habitat}</b></div>
          <div><span>Zones</span><b>{s.zones.map((z) => ZONE_LABEL[z]).join(", ")}</b></div>
          <div><span>Elevation</span><b>About {s.elevFt[0].toLocaleString()} to {s.elevFt[1].toLocaleString()} ft in Colorado</b></div>
          <div><span>Look for</span><b>{s.look.map((l) => `${l.what}${l.months.length < 12 ? ` (${monthSpan(l.months)})` : ""}`).join("; ")}</b></div>
        </div>
        <MonthStrip s={s} month={month} />
        {lookNow.length > 0 && <p className="match-ok">{lookNow.map((l) => l.what).join(" and ")} now.</p>}
        <MonthRecords s={s} month={month} />
      </section>

      {s.id === "quaking-aspen" && <AspenSpots />}

      {!!s.facts.length && (
        <section className="det-sec">
          <h3>Worth knowing <Tag p="reference" /></h3>
          <ul className="ticks">{s.facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}

      {!!s.similar.length && (
        <section className="det-sec">
          <h3>Look-alikes</h3>
          <ul className="similar">
            {s.similar.map((x) => {
              const o = speciesById(x.id)!;
              return (
                <li key={x.id}>
                  <button type="button" className="sim-row" onClick={() => act.openSpecies(o.id)}>
                    <SpeciesArt s={o} className="gh-art" />
                    <span><b>{o.common}</b>{x.tell}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {taxon.state === "ok" && taxon.value.summary && (
        <section className="det-sec">
          <h3>From Wikipedia <Tag p="inat">via iNaturalist</Tag></h3>
          <p className="wiki">{taxon.value.summary.length > 600 ? taxon.value.summary.slice(0, 600).replace(/\s\S*$/, "") + "…" : taxon.value.summary}</p>
          {taxon.value.wikipediaUrl && <a className="linkish" href={taxon.value.wikipediaUrl} target="_blank" rel="noreferrer">Read on Wikipedia</a>}
        </section>
      )}

      {!!mine.length && (
        <section className="det-sec">
          <h3>Your sightings <Tag p="yours" /></h3>
          <ul className="obs-list">{mine.map((o) => <ObsRow key={o.id} o={o} />)}</ul>
        </section>
      )}

      <p className="sp-links">
        <a href={taxonUrl(s.inat)} target="_blank" rel="noreferrer">{s.sci} on iNaturalist</a>
      </p>
      <p className="quiet small">Field-guide text is written for this atlas from standard regional knowledge and kept to well-established points. Ranges are approximate. Live photos, summaries and record counts come from iNaturalist and are credited where shown.</p>
    </SheetFrame>
  );
}

function monthSpan(ms: number[]) {
  const n = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return ms.length === 1 ? n[ms[0] - 1] : `${n[ms[0] - 1]}–${n[ms[ms.length - 1] - 1]}`;
}

function MonthStrip({ s, month }: { s: Species; month: number }) {
  const on = new Set(s.look.filter((l) => !(l.months.length === 12 && s.look.length > 1)).flatMap((l) => l.months));
  return (
    <div className="mstrip" aria-hidden="true">
      {MONTHS.map((m, i) => <span key={i} className={(on.has(i + 1) ? "on" : "") + (i + 1 === month ? " now" : "")}>{m}</span>)}
    </div>
  );
}

/* Colorado records by month from iNaturalist: a single-series bar chart (one
   hue, thin bars rounded at the top, readout on hover or tap, text fallback). */
function MonthRecords({ s, month }: { s: Species; month: number }) {
  const [rows, setRows] = useState<number[] | null | "loading">("loading");
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    setRows("loading");
    fetchMonths(s.inat).then((r) => { if (live) setRows(r); });
    return () => { live = false; };
  }, [s.inat]);
  if (rows === "loading") return <p className="quiet small">Loading Colorado records…</p>;
  if (!rows) return <p className="quiet small">Couldn't load Colorado records from iNaturalist.</p>;
  const max = Math.max(1, ...rows);
  const total = rows.reduce((a, b) => a + b, 0);
  const shown = hover ?? month - 1;
  return (
    <figure className="mrec">
      <figcaption>
        <span>Colorado records by month <Tag p="inat" /></span>
        <span className="mrec-read" aria-live="polite"><b>{MONTH_LONG[shown]}</b> {rows[shown].toLocaleString()} records</span>
      </figcaption>
      <div className="mrec-bars" onMouseLeave={() => setHover(null)}>
        {rows.map((v, i) => (
          <button key={i} type="button" className={"mrec-col" + (i === month - 1 ? " now" : "")}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
            aria-label={`${MONTH_LONG[i]}: ${v} records`}>
            <span className="mrec-bar" style={{ height: `${Math.max(v ? 4 : 0, (v / max) * 100)}%` }} />
            <span className="mrec-m">{MONTHS[i]}</span>
          </button>
        ))}
      </div>
      <p className="quiet small">{total.toLocaleString()} research-grade observations. More records partly means more people out looking, so read it as when it's noticed, not how much of it there is.</p>
    </figure>
  );
}

/* Leaf Hunter's spots are aspen country: show where the color stands now. */
function AspenSpots() {
  const act = useActions();
  const d = useAtlas();
  const now = useMemo(() => new Date(), []);
  const reports = leafReports(d);
  const spots = COLORADO_LOCATIONS.map((l) => ({ l, c: deriveCondition(l, reports, now) }))
    .sort((a, b) => b.c.colorPercent - a.c.colorPercent).slice(0, 5);
  return (
    <section className="det-sec">
      <h3>Fall color spots <Tag p="estimate" /></h3>
      <p className="quiet small">The atlas's fall-color spots are mostly aspen groves. Best estimated color right now, from Leaf Hunter's timing model and your leaf checks:</p>
      <ul className="rows">
        {spots.map(({ l, c }) => (
          <li key={l.id} className="row">
            <button type="button" className="row-main" onClick={() => act.openPlace(`color:${l.id}`)}>
              <span className="row-top"><span className="row-name">{l.name}</span><span className={"chip chip-fol chip-" + c.status}>{STATUS_META[c.status].label} · {c.colorPercent}%</span></span>
              <span className="row-where">{l.town} · {l.elevationFt.toLocaleString()} ft</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ================= GUIDE INDEX ================= */
export function GuideIndex({ onClose }: { onClose: () => void }) {
  const act = useActions();
  const d = useAtlas();
  const found = new Set(collection(d).map((e) => e.speciesId));
  const [q, setQ] = useState("");
  const [g, setG] = useState<Group | "all">("all");
  const list = SPECIES.filter((s) => (g === "all" || s.groups.includes(g)) &&
    (!q || `${s.common} ${s.sci} ${s.family}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <SheetFrame label="Field guide" onClose={onClose}>
      <header className="sp-head">
        <div className="det-eyebrow">FIELD GUIDE · {SPECIES.length} COLORADO PLANTS</div>
        <h2 className="det-name">Field Guide</h2>
        <p className="quiet">Common trees, shrubs and wildflowers along the trails in this atlas. You've found {found.size} of them.</p>
      </header>
      <div className="search">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names" aria-label="Search the field guide" />
      </div>
      <div className="chips" role="toolbar" aria-label="Group">
        {(["all", "broadleaf", "conifer", "flower"] as const).map((k) => (
          <button key={k} type="button" className={"fchip" + (g === k ? " fchip-on" : "")} aria-pressed={g === k} onClick={() => setG(k)}>
            {k === "all" ? "All" : GROUP_LABEL[k]}
          </button>
        ))}
      </div>
      <ul className="picker-list guide-list">
        {list.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => act.openSpecies(s.id)}>
              <SpeciesArt s={s} className="gh-art" />
              <span><b>{s.common}</b><i>{s.sci}</i></span>
              {found.has(s.id) && <span className="found-mark">Found</span>}
            </button>
          </li>
        ))}
        {!list.length && <li className="quiet pad">No plants match “{q}”.</li>}
      </ul>
    </SheetFrame>
  );
}

/* ================= OBSERVATION ================= */
export function ObservationSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const act = useActions();
  const d = useAtlas();
  const o = d.observations.find((x) => x.id === id);
  const url = usePhotoUrl(o?.photoId ?? null, o?.thumb ?? null);
  const [confirm, setConfirm] = useState(false);
  if (!o) return <SheetFrame label="Find" onClose={onClose}><p className="quiet pad">This find was deleted.</p></SheetFrame>;
  const s = speciesById(o.speciesId);
  const place = placeByRef(o.placeRef);
  const outing = d.outings.find((x) => x.id === o.outingId);
  const del = async () => {
    removeObservation(o.id);
    if (o.photoId) await deletePhoto(o.photoId);
    act.toast("Find deleted");
    onClose();
  };
  return (
    <SheetFrame label={s ? `Your find: ${s.common}` : o.taxon ? `Your sighting: ${o.taxon.common ?? o.taxon.name}` : "Your find"} onClose={onClose}>
      {url ? <figure className="sp-hero"><img src={url} alt={s ? `Your photo of ${s.common}` : o.taxon ? `Your photo of ${o.taxon.common ?? o.taxon.name}` : "Your photo"} /></figure> : null}
      <header className="sp-head">
        <div className="det-eyebrow">{o.kind === "leafcheck" ? "LEAF CHECK" : "YOUR FIND"} · {fmtDate(o.observedAt, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>
        <h2 className="det-name">{o.kind === "leafcheck" ? `${o.color?.percent ?? 0}% color` : s ? s.common : o.taxon ? o.taxon.common ?? o.taxon.name : "Not identified yet"}</h2>
        {s && <div className="sp-sci"><i>{s.sci}</i></div>}
        {o.taxon && <div className="sp-sci"><i>{o.taxon.name}</i></div>}
        {o.taxon && (
          <p className="quiet small">
            <Tag p="yours" /> {o.idMethod === "photo" ? `Your ID, from a photo suggestion${o.photoLikelihood ? ` (${o.photoLikelihood})` : ""}` : o.idMethod === "compare" ? "Your ID, compared with sightings nearby" : "Your ID, found by name"}
          </p>
        )}
        {o.kind === "find" && s && (
          <p className="quiet small">
            <Tag p="yours" /> {o.idMethod === "key" ? `Your ID, with the field key's ${o.keyStrength ? STRENGTH_TEXT[o.keyStrength].toLowerCase() : "suggestion"}` : o.idMethod === "guide" ? "Your ID, picked from the field guide" : "Your ID"}
          </p>
        )}
        {o.kind === "leafcheck" && o.color && <p className="quiet small"><Tag p="yours" /> {STATUS_META[o.color.status].label}: {STATUS_META[o.color.status].description}</p>}
      </header>

      {o.kind === "find" && !s && !o.taxon && <WildNameIt o={o} />}

      {o.kind === "find" && !s && !o.taxon && (
        <section className="det-sec">
          <h3>{o.candidates.length ? "Name it" : "Or name it as a plant"}</h3>
          {o.candidates.length ? <>
            <p className="quiet small"><Tag p="suggestion" /> The key's suggestions when you saved it:</p>
            <ul className="similar">
              {o.candidates.map((c) => {
                const cs = speciesById(c)!;
                return (
                  <li key={c}>
                    <div className="sim-row">
                      <SpeciesArt s={cs} className="gh-art" />
                      <span><b>{cs.common}</b>{cs.idMarks[0]}</span>
                    </div>
                    <div className="id-actions">
                      <button type="button" className="pa-btn" onClick={() => act.openSpecies(c)}>Field guide</button>
                      <button type="button" className="pa-btn pa-primary" onClick={() => updateObservation(o.id, { speciesId: c, idMethod: "key" })}>It's this one</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </> : <p className="quiet">No suggestions were saved with this one.</p>}
          <label className="notes-lbl" htmlFor="obs-pick">Or choose from the guide</label>
          <select id="obs-pick" className="select" value="" onChange={(e) => e.target.value && updateObservation(o.id, { speciesId: e.target.value, idMethod: "guide" })}>
            <option value="">Pick a species…</option>
            {SPECIES.map((x) => <option key={x.id} value={x.id}>{x.common}</option>)}
          </select>
        </section>
      )}

      <section className="det-sec">
        <h3>Details</h3>
        <div className="kv">
          <div><span>Place</span><b>{place ? <button type="button" className="linkish" onClick={() => act.openPlace(place.ref)}>{place.name}</button> : "No place"}</b></div>
          <div><span>Outing</span><b>{outing ? <button type="button" className="linkish" onClick={() => act.openOuting(outing.id)}>{fmtDate(outing.startedAt)}</button> : "None"}</b></div>
          {o.coords && <div><span>Location</span><b>{o.coords.approx ? `About ${o.coords.lat.toFixed(2)}, ${o.coords.lon.toFixed(2)} (rounded to ~1 km)` : `${o.coords.lat.toFixed(5)}, ${o.coords.lon.toFixed(5)} (±${o.coords.acc} m)`} <button type="button" className="linkish" onClick={() => updateObservation(o.id, { coords: null })}>Remove</button></b></div>}
          {o.source === "leaf-hunter" && <div><span>From</span><b>Imported from Leaf Hunter</b></div>}
        </div>
        <label className="notes-lbl" htmlFor="obs-note">Field note</label>
        <textarea id="obs-note" className="notes" rows={3} value={o.note} onChange={(e) => updateObservation(o.id, { note: e.target.value })} placeholder="Add a note" />
        <div className="fieldlog-save">Saved on this device.</div>
      </section>

      <div className="id-actions">
        {s && <button type="button" className="pa-btn" onClick={() => act.openSpecies(s.id)}>Field guide entry</button>}
        {s && o.kind === "find" && <button type="button" className="pa-btn" onClick={() => updateObservation(o.id, { speciesId: null, idMethod: "none" })}>Not sure any more</button>}
        {o.taxon && <button type="button" className="pa-btn" onClick={() => act.openTaxon(o.taxon!.id)}>Species page</button>}
        {o.taxon && <button type="button" className="pa-btn" onClick={() => updateObservation(o.id, { taxon: null, idMethod: "none", photoLikelihood: undefined })}>Not sure any more</button>}
        {confirm
          ? <button type="button" className="pa-btn pa-danger" onClick={del}>Tap again to delete</button>
          : <button type="button" className="pa-btn" onClick={() => setConfirm(true)}>Delete find</button>}
      </div>
    </SheetFrame>
  );
}

/* Name an unidentified sighting as an animal: search iNaturalist, pick by taxon id. */
function WildNameIt({ o }: { o: Observation }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<WildSpecies[] | null>(null);
  const [busy, setBusy] = useState(false);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setHits(await searchWildTaxa(q, null));
    setBusy(false);
  };
  const name = async (h: WildSpecies) => {
    const full = await fetchWildTaxon(h.taxonId);
    const sensitive = full ? full.sensitive : true;
    updateObservation(o.id, {
      taxon: { id: h.taxonId, name: h.name, common: h.common, iconic: h.iconic, sensitive }, idMethod: "search",
      ...(sensitive ? { coords: null } : {}),
    });
  };
  return (
    <section className="det-sec">
      <h3>Name it as an animal</h3>
      <form className="lp-form" onSubmit={search} role="search">
        <label htmlFor="obs-wild-q" className="sr-only">Search birds, insects and other animals</label>
        <div className="search"><input id="obs-wild-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search birds, insects, mammals…" /></div>
        <button type="submit" className="pa-btn" disabled={busy}>{busy ? "Looking…" : "Search"}</button>
      </form>
      {hits && (hits.length ? (
        <ul className="picker-list">
          {hits.map((h) => (
            <li key={h.taxonId}><button type="button" onClick={() => name(h)}><WildArt photo={h.photo} className="gh-art" /><span><b>{h.common ?? h.name}</b><i>{h.name}</i></span></button></li>
          ))}
        </ul>
      ) : <p className="quiet">Nothing by that name on iNaturalist.</p>)}
      <p className="quiet small">Names come from iNaturalist. A sensitive species' location is removed when you name it.</p>
    </section>
  );
}

/* ================= OUTING ================= */
export function OutingSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const act = useActions();
  const d = useAtlas();
  const o = d.outings.find((x) => x.id === id);
  const [confirm, setConfirm] = useState(false);
  if (!o) return <SheetFrame label="Outing" onClose={onClose}><p className="quiet pad">This outing was deleted.</p></SheetFrame>;
  const place = placeByRef(o.placeRef);
  const obs = observationsOn(d, o.id);
  const species = [...new Set(obs.map((x) => x.speciesId).filter(Boolean))];
  const live = activeOuting(d)?.id === o.id;
  return (
    <SheetFrame label="Outing" onClose={onClose}>
      <header className="sp-head">
        <div className="det-eyebrow">{live ? "OUTING IN PROGRESS" : "OUTING"} · {fmtDate(o.startedAt, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>
        <h2 className="det-name">{place?.name ?? "Outing"}</h2>
        <p className="quiet">{fmtDuration(o.startedAt, o.endedAt)} · {obs.length} find{obs.length === 1 ? "" : "s"} · {species.length} species</p>
        {place && <button type="button" className="pa-btn" onClick={() => act.openPlace(place.ref)}>Open {place.name}</button>}
      </header>
      <section className="det-sec">
        <h3>Finds <Tag p="yours" /></h3>
        {obs.length ? <ul className="obs-list">{obs.map((x) => <ObsRow key={x.id} o={x} showPlace={false} />)}</ul> : <p className="quiet">No finds on this outing.</p>}
        {live && <button type="button" className="pa-btn pa-primary" onClick={() => act.identifyAt(o.placeRef)}>Log a find</button>}
      </section>
      <section className="det-sec">
        <h3>Trip notes</h3>
        <textarea className="notes" rows={3} aria-label="Trip notes" value={o.note} onChange={(e) => updateOuting(o.id, { note: e.target.value })} placeholder="Weather, company, what stood out…" />
      </section>
      <div className="id-actions">
        {live && <button type="button" className="pa-btn" onClick={() => { endOuting(o.id); act.onOutingEnded(o.placeRef, !!o.placeRef?.startsWith("trail:")); }}>End outing</button>}
        {confirm
          ? <button type="button" className="pa-btn pa-danger" onClick={() => { removeOuting(o.id); onClose(); act.toast("Outing deleted. Its finds are still in your atlas."); }}>Tap again to delete</button>
          : <button type="button" className="pa-btn" onClick={() => setConfirm(true)}>Delete outing</button>}
      </div>
    </SheetFrame>
  );
}
