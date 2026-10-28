import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Place } from "../lib/places";
import { COLORADO_LOCATIONS } from "../data/foliage";
import { SITES } from "../data/darksky";
import { STATUS_META, TIMING_LABEL, deriveCondition, statusFromPercent } from "../lib/foliage/foliage";
import type { FoliageReport } from "../lib/foliage/types";
import { formatRange } from "../lib/foliage/dates";
import { measureMid, measureText } from "../lib/astro/types";
import { addObservation, newId, useAtlas } from "../lib/atlas";
import type { AtlasData } from "../lib/atlas";
import { putPhoto, processImage } from "../lib/photos";
import { directionsUrl, driveMin, fmtDrive } from "../lib/geo";
import type { StartPoint } from "../data/types";
import { fmtClock, tonightAt } from "../lib/tonight";
import { Locator } from "./TrailDetail";
import { NearbyNature, PlaceActions, YourFinds, useActions } from "./PlaceSections";
import { Tag } from "./atlasBits";

const LOC_BY_ID = new Map(COLORADO_LOCATIONS.map((l) => [l.id, l]));
const SITE_BY_ID = new Map(SITES.map((s) => [s.id, s]));
export const LOOKUP_URL = "https://scottyfncodes.github.io/LOOKUP/";

/* The user's own leaf checks become the reports Leaf Hunter's model reads.
   (Leaf Hunter's generated "demo" reports are deliberately not carried over.) */
export function leafReports(d: AtlasData): FoliageReport[] {
  return d.observations
    .filter((o) => o.kind === "leafcheck" && o.color && o.placeRef?.startsWith("color:"))
    .map((o) => ({
      id: o.id, locationId: o.placeRef!.slice(6), observedAt: o.observedAt,
      colorPercent: o.color!.percent, status: o.color!.status, note: o.note, source: "local" as const,
    }));
}

interface Props { place: Place; start: StartPoint; onClose: () => void }

export function PlaceDetail({ place, start, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [place.ref]);
  const drive = driveMin(start, place);
  const top = (
    <>
      <div className="det-cta">
        <a className="dir-btn" href={directionsUrl(place.lat, place.lon)} target="_blank" rel="noreferrer">Directions</a>
        <div className="det-drive">~{fmtDrive(drive)} drive from {start.label}<br /><span>estimate, not routed</span></div>
      </div>
      <PlaceActions place={place} />
    </>
  );
  return (
    <article className="det" aria-labelledby="det-name">
      <div className="det-bar">
        <button ref={closeRef} type="button" className="det-close" onClick={onClose} aria-label="Close place details">
          <span aria-hidden="true">←</span> Back
        </button>
      </div>
      <header className="det-head">
        <div className="det-head-text">
          <div className="det-eyebrow">{(place.kind === "color" ? "Fall color spot" : "Dark-sky site").toUpperCase()} · {place.sub.toUpperCase()}</div>
          <h2 id="det-name" className="det-name">{place.name}</h2>
        </div>
        <Locator t={place} />
      </header>
      {place.kind === "color" ? <ColorBody place={place} top={top} /> : <SkySummary place={place} />}
      {place.kind === "sky" && <>{top}<SkyBody place={place} /></>}
      <YourFinds place={place} />
      <NearbyNature place={place} />
    </article>
  );
}

function ColorBody({ place, top }: { place: Place; top: ReactNode }) {
  const loc = LOC_BY_ID.get(place.id)!;
  const d = useAtlas();
  const now = useMemo(() => new Date(), []);
  const cond = deriveCondition(loc, leafReports(d), now);
  const meta = STATUS_META[cond.status];
  return (
    <>
      <p className="det-lede">{loc.summary}</p>
      <dl className="stats">
        <div><dt>Color now</dt><dd>{cond.colorPercent}%<small>{meta.label}</small></dd></div>
        <div><dt>Timing</dt><dd>{TIMING_LABEL[cond.timing]}<small>typical peak {formatRange(loc.typical.peakStart, loc.typical.peakEnd, now)}</small></dd></div>
        <div><dt>Elevation</dt><dd>{loc.elevationFt.toLocaleString()} ft<small>viewing area, approx.</small></dd></div>
        <div><dt>Access</dt><dd>{loc.accessType.replace("-", " ")}<small>about {Math.round(loc.visitMinutes / 15) * 15} min stop</small></dd></div>
      </dl>
      <p className="basis">
        {cond.basis === "report"
          ? <><Tag p="yours" /> From your leaf check {cond.latestReport ? new Date(cond.latestReport.observedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}, nudged by Leaf Hunter's timing model.</>
          : <><Tag p="estimate" /> Leaf Hunter's model from this spot's typical peak window. Not an observation; a fresh leaf check overrides it.</>}
      </p>
      {top}
      <section className="det-sec">
        <h3>Why go</h3>
        <ul className="ticks">{loc.whyGo.map((w) => <li key={w}>{w}</li>)}</ul>
      </section>
      <LeafCheck place={place} />
    </>
  );
}

/* Leaf Hunter's sub-20-second report: how much color, a note, an optional photo. */
function LeafCheck({ place }: { place: Place }) {
  const act = useActions();
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(60);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; thumb: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const status = statusFromPercent(pct);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setErr(null);
    try { const p = await processImage(f); setPhoto({ blob: p.blob, thumb: p.thumb }); }
    catch { setErr("Couldn't read that photo. Try another."); }
    finally { setBusy(false); }
  };

  const save = async () => {
    let photoId: string | null = null;
    if (photo) { photoId = newId("photo"); await putPhoto(photoId, photo.blob); }
    addObservation({
      kind: "leafcheck", speciesId: null, candidates: [], idMethod: "none",
      placeRef: place.ref, note: note.trim(), photoId, thumb: photo?.thumb ?? null, coords: null,
      color: { percent: pct, status },
    });
    setOpen(false); setNote(""); setPhoto(null);
    act.toast("Leaf check saved to your atlas");
  };

  if (!open) return (
    <section className="det-sec">
      <h3>Leaf check</h3>
      <p className="quiet">Here now? Log how much color you see. Your check updates this spot's status on this device.</p>
      <button type="button" className="pa-btn pa-primary" onClick={() => setOpen(true)}>Log a leaf check</button>
    </section>
  );
  return (
    <section className="det-sec leafcheck" aria-label="Leaf check">
      <h3>Leaf check</h3>
      <label className="lc-lbl" htmlFor="lc-pct">How much color? <b>{pct}%</b> · {STATUS_META[status].short}</label>
      <input id="lc-pct" className="lc-range" type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(+e.target.value)} />
      <label className="notes-lbl" htmlFor="lc-note">Note (optional)</label>
      <textarea id="lc-note" className="notes" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Upper groves gold, valley still green…" />
      <div className="lc-row">
        <label className="pa-btn file-btn">
          {busy ? "Reading photo…" : photo ? "Change photo" : "Add a photo"}
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {photo && <img className="lc-thumb" src={photo.thumb} alt="Your leaf check photo" />}
      </div>
      {err && <p className="notice">{err}</p>}
      <div className="lc-row">
        <button type="button" className="pa-btn" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="pa-btn pa-primary" onClick={save} disabled={busy}>Save leaf check</button>
      </div>
    </section>
  );
}

function SkySummary({ place }: { place: Place }) {
  const site = SITE_BY_ID.get(place.id)!;
  const t = useMemo(() => tonightAt(site.lat, site.lon), [site]);
  return (
      <dl className="stats">
        <div><dt>Designation</dt><dd>{site.designation === "none" ? "None" : site.designation}<small>{site.certifiedYear ? `certified ${site.certifiedYear}` : site.designation === "none" ? "popular spot, not certified" : "year unknown"}</small></dd></div>
        <div><dt>Bortle class</dt><dd>{measureText(site.bortle)}<small>{site.bortle == null ? "nobody credible has said" : "estimate, not measured"}</small></dd></div>
        <div><dt>Elevation</dt><dd>{measureMid(site.elevationM ?? null) == null ? "Unknown" : `${(Math.round(measureMid(site.elevationM ?? null)! * 3.281 / 10) * 10).toLocaleString()} ft`}<small>representative point</small></dd></div>
        <div><dt>Moon tonight</dt><dd>{Math.round(t.illumination * 100)}%<small>{t.phase.toLowerCase()}</small></dd></div>
      </dl>
  );
}

function SkyBody({ place }: { place: Place }) {
  const site = SITE_BY_ID.get(place.id)!;
  const t = useMemo(() => tonightAt(site.lat, site.lon), [site]);
  const dark = t.darkStart != null && t.darkEnd != null;
  return (
    <>
      <section className="det-sec" aria-label="Tonight's sky">
        <h3>Tonight's sky <Tag p="computed" /></h3>
        <div className="kv">
          <div><span>Sunset</span><b>{fmtClock(t.sunset)}</b></div>
          <div><span>Full dark</span><b>{dark ? `${fmtClock(t.darkStart)} to ${fmtClock(t.darkEnd)}` : "No full darkness tonight"}</b></div>
          <div><span>Moon</span><b>{t.moonRise ? `Rises ${fmtClock(t.moonRise)}` : ""}{t.moonRise && t.moonSet ? " · " : ""}{t.moonSet ? `Sets ${fmtClock(t.moonSet)}` : ""}{!t.moonRise && !t.moonSet ? "No rise or set during the night" : ""}</b></div>
          <div><span>Moon-free dark</span><b>{dark ? `${Math.floor(t.moonFreeMinutes / 60)} hr ${t.moonFreeMinutes % 60} min` : "none"}</b></div>
        </div>
        <p className="quiet small">Astronomy worked out on your phone, the same math LOOKUP uses. It doesn't know about clouds: <a href={LOOKUP_URL} target="_blank" rel="noreferrer">LOOKUP</a> adds the cloud forecast and the drive to make the go or no-go call.</p>
      </section>
      {!!site.notes.length && (
        <section className="det-sec">
          <h3>Know before you go</h3>
          <ul className="ticks">{site.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}
      <section className="det-sec">
        <h3>Sources</h3>
        <ul className="sources">
          {site.sources.map((s) => (
            <li key={s.label}>
              <Tag p={s.confidence === "official" ? "reference" : "estimate"}>{s.confidence === "official" ? "Official" : "Estimate"}</Tag>{" "}
              {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label}
              {s.checked && <span className="quiet small"> · checked {s.checked}</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
