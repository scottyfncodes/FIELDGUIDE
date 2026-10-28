import { useEffect, useRef, useState } from "react";
import { LOCATE_MESSAGE, ROUGH_ACCURACY_M, locate } from "../lib/locate";
import { GEOCODE_MESSAGE, geocode, placeNameNear } from "../lib/geocode";
import type { GeoResult } from "../lib/geocode";
import { RADIUS_PRESETS } from "../lib/discover";
import type { Origin } from "../lib/discover";

/* ---------- WHERE TO START ----------
   Two ways in, both chosen by the person:
     Use my location   asks the phone only when tapped, explains why first
     Address or place  anything the geocoder knows: street, town, ZIP, park,
                       trailhead, peak
   Any failure lands on the address field with the reason in plain words;
   nothing ever falls back to a town we picked. */
interface Props {
  origin: Origin | null;
  radiusMi: number;
  onOrigin: (o: Origin) => void;
  onRadius: (mi: number) => void;
  /** a search is running for the current origin */
  searching: boolean;
}

export function LocationPanel({ origin, radiusMi, onOrigin, onRadius, searching }: Props) {
  const [editing, setEditing] = useState(!origin);
  const [q, setQ] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "warn" | "info" } | null>(null);
  const [choices, setChoices] = useState<GeoResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!origin) setEditing(true); }, [origin]);

  const useMine = async () => {
    setLocBusy(true); setMsg(null); setChoices(null);
    const r = await locate();
    setLocBusy(false);
    if (!r.ok) {
      setMsg({ text: LOCATE_MESSAGE[r.reason], tone: "warn" });
      setEditing(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    const rough = r.acc > ROUGH_ACCURACY_M;
    if (rough) setMsg({ text: `Your phone's fix is rough (about ${Math.round(r.acc / 1000)} km). Distances may be off; type an address for a precise start.`, tone: "info" });
    const o: Origin = { kind: "gps", lat: r.lat, lon: r.lon, acc: r.acc, label: "Your location" };
    onOrigin(o);
    setEditing(false);
    placeNameNear(r.lat, r.lon).then((name) => { if (name) onOrigin({ ...o, label: `Near ${name}` }); });
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) { setMsg({ text: "Type a town, ZIP code, park, trailhead or street address.", tone: "warn" }); return; }
    setGeoBusy(true); setMsg(null); setChoices(null);
    const out = await geocode(q);
    setGeoBusy(false);
    if (out.status === "empty") { setMsg({ text: GEOCODE_MESSAGE.empty, tone: "warn" }); return; }
    if (out.status === "error") { setMsg({ text: GEOCODE_MESSAGE[out.kind], tone: "warn" }); return; }
    if (out.results.length === 1) pick(out.results[0]);
    else setChoices(out.results);
  };

  const pick = (r: GeoResult) => {
    setChoices(null); setMsg(null); setEditing(false);
    onOrigin({ kind: "place", lat: r.lat, lon: r.lon, label: [r.label, r.detail.split(",")[0]].filter(Boolean).join(", ") });
  };

  return (
    <section className={"locpanel" + (origin && !editing ? " locpanel-set" : "")} aria-label="Where to look for trails">
      {origin && !editing ? (
        <div className="lp-summary">
          <p className="lp-from">
            <span className="lp-eyebrow">{origin.kind === "gps" ? "From your location" : "From"}</span>
            <b>{origin.label}</b>
          </p>
          <div className="lp-summary-actions">
            <button type="button" className="pa-btn" onClick={() => { setEditing(true); setMsg(null); requestAnimationFrame(() => inputRef.current?.focus()); }}>Change</button>
            <button type="button" className="pa-btn" onClick={useMine} disabled={locBusy}>{locBusy ? "Finding you…" : origin.kind === "gps" ? "Update" : "Use my location"}</button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="lp-title">Find trails near…</h2>
          <button type="button" className="lp-locate" onClick={useMine} disabled={locBusy}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>{locBusy ? "Finding you…" : "Use my location"}</span>
          </button>
          <p className="lp-why">Your phone will ask first. The location is used to measure distances to trails and is kept only on this device.</p>
          <div className="lp-or" aria-hidden="true"><span>or</span></div>
          <form className="lp-form" onSubmit={search} role="search">
            <label htmlFor="lp-q" className="sr-only">Address or place</label>
            <div className="search">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" /></svg>
              <input id="lp-q" ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Town, ZIP, park, trailhead or address" enterKeyHint="search" autoComplete="off" />
            </div>
            <button type="submit" className="pa-btn pa-primary" disabled={geoBusy}>{geoBusy ? "Looking…" : "Search"}</button>
          </form>
          {origin && <button type="button" className="linkish lp-cancel" onClick={() => { setEditing(false); setMsg(null); setChoices(null); }}>Keep {origin.label}</button>}
        </>
      )}

      {msg && <p className={"lp-msg lp-" + msg.tone} role={msg.tone === "warn" ? "alert" : "status"}>{msg.text}</p>}

      {choices && (
        <div className="lp-choices">
          <p className="lp-choices-hd">Which one?</p>
          <ul>
            {choices.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pick(c)}>
                  <b>{c.label}</b>
                  <span>{c.detail}</span>
                  <small>{c.kind}</small>
                </button>
              </li>
            ))}
          </ul>
          <p className="quiet small">Not here? Add a town or state to the search.</p>
        </div>
      )}

      {origin && (
        <div className="lp-radius" role="radiogroup" aria-label="Search radius">
          <span className="lp-radius-lbl">Within</span>
          {RADIUS_PRESETS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={radiusMi === r} className={"lp-r" + (radiusMi === r ? " on" : "")}
              onClick={() => onRadius(r)} disabled={searching && radiusMi !== r}>{r} mi</button>
          ))}
        </div>
      )}
      {(!origin || editing) && <p className="lp-credit">Place search: OpenStreetMap Nominatim, Photon. © OpenStreetMap contributors.</p>}
    </section>
  );
}
