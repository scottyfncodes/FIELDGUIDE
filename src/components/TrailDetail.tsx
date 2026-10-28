import { useEffect, useRef, useState } from "react";
import type { Area, LogEntry, StartPoint, Trail, Weather } from "../data/types";
import { STATE, regionOfArea } from "../data/geography";
import { directionsUrl, driveMin, fmtDrive, sunTimes } from "../lib/geo";
import { MONTH_LBL, currentMonth, inSeason } from "../lib/season";
import { bookHours, fmtHours, standing } from "../lib/trails";
import { TRAILS } from "../data/trails";
import { RING_FT, TopoPlate, ringsFor } from "./TopoPlate";
import { Tag } from "./atlasBits";
import { verdict } from "../lib/weather";
import { DiffTag, RatingInput, Stars, VerdictChip } from "./bits";
import { placeByRef } from "../lib/places";
import { NearbyNature, PlaceActions, YourFinds } from "./PlaceSections";

/* Tiny locator: where in the state is this? */
export function Locator({ t }: { t: { lat: number; lon: number } }) {
  const W = 88, H = 64;
  const lx = (lon: number) => ((lon - STATE.west) / (STATE.east - STATE.west)) * W;
  const ly = (lat: number) => ((STATE.north - lat) / (STATE.north - STATE.south)) * H;
  return (
    <svg className="locator" viewBox={`-2 -2 ${W + 4} ${H + 4}`} width={W + 4} height={H + 4} aria-hidden="true">
      <rect x="0" y="0" width={W} height={H} className="locator-state" />
      {/* Denver, for reference */}
      <rect x={lx(-104.99) - 1.5} y={ly(39.74) - 1.5} width="3" height="3" className="locator-city" />
      <circle cx={lx(t.lon)} cy={ly(t.lat)} r="4.5" className="locator-dot" />
    </svg>
  );
}

/* One number, this trail against the other atlas trails: a tick for each, this one in red */
function Standing({ t, k, unit, more }: { t: Trail; k: "mi" | "gain"; unit: string; more: string }) {
  const s = standing(t, TRAILS, k);
  const pos = (v: number) => `${((v - s.min) / (s.max - s.min || 1)) * 100}%`;
  return (
    <figure className="standing">
      <figcaption>
        <span>{k === "mi" ? "Distance" : "Climb"}</span>
        <b>{s.below} of {s.others} others {k === "mi" ? "are shorter" : "climb less"}</b>
      </figcaption>
      <div className="standing-track" aria-hidden="true">
        {TRAILS.filter((o) => o.id !== t.id).map((o) => <i key={o.id} style={{ left: pos(o[k]) }} />)}
        <i className="standing-me" style={{ left: pos(t[k]) }} />
      </div>
      <div className="standing-scale" aria-hidden="true">
        <span>{s.min.toLocaleString()} {unit}</span><span>{s.max.toLocaleString()} {unit}</span>
      </div>
      <span className="sr-only">{`${t[k].toLocaleString()} ${unit}: ${more} than ${s.below} of the other ${s.others} trails.`}</span>
    </figure>
  );
}

interface Props {
  t: Trail;
  area: Area | undefined;
  start: StartPoint;
  w: Weather | null;
  p: LogEntry;
  onPatch: (patch: LogEntry) => void;
  onClose: () => void;
  onShowOnMap: () => void;
}

export function TrailDetail({ t, area, start, w, p, onPatch, onClose, onShowOnMap }: Props) {
  const v = verdict(w);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const region = regionOfArea(t.area);
  const drive = driveMin(start, t);
  const hours = bookHours(t);
  const month = currentMonth();
  const seasonNow = inSeason(t.prime, month);
  const sun = sunTimes(t.lat, t.lon);
  const hasApres = !!(area?.brew?.length || area?.eat?.length);
  const place = placeByRef(`trail:${t.id}`);

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [t.id]);

  const share = async () => {
    const url = `${location.origin}${location.pathname}#trail=${t.id}`;
    try {
      if (navigator.share) { await navigator.share({ title: t.name, text: `${t.name} | CO Trail Atlas`, url }); return; }
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setShareMsg("Couldn't share. Copy the address bar instead.");
    }
    setTimeout(() => setShareMsg(null), 2500);
  };

  return (
    <article className="det" aria-labelledby="det-name">
      <div className="det-bar">
        <button ref={closeRef} type="button" className="det-close" onClick={onClose} aria-label="Close trail details">
          <span aria-hidden="true">←</span> Back
        </button>
        <div className="det-bar-actions">
          <button type="button" className="det-act" onClick={onShowOnMap}>Map</button>
          <button type="button" className="det-act" onClick={share}>Share</button>
        </div>
      </div>
      {shareMsg && <div className="det-toast" role="status">{shareMsg}</div>}

      <header className="det-head">
        <TopoPlate id={t.id} gain={t.gain} className="det-plate" summit draw />
        <div className="det-head-text">
          <div className="det-eyebrow">
            {[region?.label, area?.label].filter(Boolean).join(" · ").toUpperCase()}
          </div>
          <h2 id="det-name" className="det-name">{t.name}</h2>
          <div className="det-th">{t.th}</div>
        </div>
        <Locator t={t} />
        <p className="det-plate-key">{ringsFor(t.gain)} {ringsFor(t.gain) === 1 ? "ring" : "rings"} · ~{RING_FT} ft of climb each</p>
      </header>

      {/* the four numbers people decide on */}
      <dl className="stats">
        <div><dt>Distance</dt><dd>{t.mi} mi<small>{t.type}</small></dd></div>
        <div><dt>Climb</dt><dd>{t.gain.toLocaleString()} ft<small>{t.gainR || " "}</small></dd></div>
        <div><dt>Time</dt><dd>~{fmtHours(hours)}<small>book-time estimate</small></dd></div>
        <div><dt>Difficulty</dt><dd><DiffTag d={t.diff} /><small><Stars n={t.views} label="Views" /> views</small></dd></div>
      </dl>

      <section className="det-sec compare-sec" aria-label="Among the atlas trails">
        <h3>Among the {TRAILS.length} atlas trails <Tag p="computed" /></h3>
        <Standing t={t} k="mi" unit="mi" more="longer" />
        <Standing t={t} k="gain" unit="ft" more="more climbing" />
      </section>

      <section className={"det-wx" + (v ? " det-wx-" + v.toLowerCase() : "")} aria-label="Today's forecast">
        {w ? (
          <>
            <VerdictChip v={v} />
            <p className="det-wx-line">
              {w.summary} · {w.hi}° / {w.lo}° · wind to {w.wind} mph · {w.precip}% chance of precip
            </p>
            <p className="det-wx-note">Forecast for the trailhead's grid cell. Summits run colder and windier.</p>
          </>
        ) : (
          <p className="det-wx-line">No forecast loaded yet. It fills in automatically when you're online.</p>
        )}
      </section>

      {place && <PlaceActions place={place} hiked={!!p.done} />}

      <section className="det-sec">
        <h3>When to go</h3>
        <div className="kv">
          <div><span>Prime season</span><b>{t.prime}{" "}
            <em className={"season-badge" + (seasonNow ? " on" : "")}>{seasonNow ? `in season (${MONTH_LBL[month - 1]})` : `off season in ${MONTH_LBL[month - 1]}`}</em></b></div>
          {t.arrive && <div><span>Arrive</span><b>{t.arrive}</b></div>}
          {sun && <div><span>Sun today</span><b>Up {sun.rise} · down {sun.set}</b></div>}
        </div>
      </section>

      <section className="det-sec">
        <h3>Know before you go</h3>
        <div className="kv">
          <div><span>Vehicle</span><b>{t.vehicle}</b></div>
          {t.vroad && <div><span>Road</span><b>{t.vroad}</b></div>}
          {t.avoid && <div className="kv-avoid"><span>Avoid</span><b>{t.avoid}</b></div>}
        </div>
      </section>

      <section className="fieldlog" aria-label="Field log">
        <h3>Field log</h3>
        <button type="button" className={"done-toggle" + (p.done ? " on" : "")} aria-pressed={!!p.done}
          onClick={() => onPatch({ done: !p.done })}>
          <span className={"box big" + (p.done ? " box-on" : "")} aria-hidden="true">{p.done ? "✓" : ""}</span>
          {p.done ? "Hiked it: logged" : "Mark as hiked"}
        </button>
        <div className="myrating">
          <span id="rating-lbl">My rating</span>
          <RatingInput n={p.rating || 0} onSet={(n) => onPatch({ rating: n })} />
        </div>
        <label className="notes-lbl" htmlFor="trip-notes">Trip notes</label>
        <textarea
          id="trip-notes"
          className="notes"
          placeholder="Conditions, parking beta, who came along, where the beer was…"
          value={p.notes || ""}
          onChange={(e) => onPatch({ notes: e.target.value })}
          rows={4}
        />
        <div className="fieldlog-save">Saved on this device.</div>
        {p.done && <div className="stamp" aria-hidden="true">LOGGED</div>}
      </section>

      {place && <>
        <YourFinds place={place} />
        <NearbyNature place={place} />
      </>}

      {hasApres && (
        <section className="det-sec apres">
          <h3>After: near {area!.label}</h3>
          <div className="apres-cols">
            {!!area!.brew?.length && (
              <div>
                <div className="apres-hd">Pints</div>
                {area!.brew.map((b) => <div key={b.n} className="apres-item"><b>{b.n}</b><span>{b.d}</span></div>)}
              </div>
            )}
            {!!area!.eat?.length && (
              <div>
                <div className="apres-hd">Plates</div>
                {area!.eat.map((b) => <div key={b.n} className="apres-item"><b>{b.n}</b><span>{b.d}</span></div>)}
              </div>
            )}
          </div>
          <p className="apres-note">Local picks. Hours and owners change, so check before you go.</p>
        </section>
      )}

      {/* the primary action rides along at the bottom of the sheet, in thumb reach */}
      <div className="det-cta">
        <div className="det-drive"><b>~{fmtDrive(drive)} drive</b> from {start.label} <span>· estimate, not routed</span></div>
        <a className="dir-btn" href={directionsUrl(t.lat, t.lon)} target="_blank" rel="noreferrer">
          Directions to trailhead
        </a>
      </div>
    </article>
  );
}
