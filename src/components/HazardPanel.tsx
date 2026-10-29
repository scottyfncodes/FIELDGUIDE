import { useState } from "react";
import { SOURCE, ageText, aqiCategory, checkHazard, isStale, loadCachedHazards } from "../lib/hazards";
import type { HazardKind, HazardResult, NwsAlert, Point } from "../lib/hazards";
import { locate } from "../lib/locate";
import type { LocateFail } from "../lib/locate";
import { directionsUrl } from "../lib/geo";
import { fmtMi } from "../lib/discover";
import { Tag } from "./atlasBits";

/* ---------- LIVE CONDITIONS ----------
   Opt-in: nothing is fetched and no location is asked for until a button is
   tapped. On a place page the point is the place itself, so no permission is
   needed at all. Every answer shows its source, when it was fetched and for
   where; anything older than its window is marked stale; a failure is never
   shown as an all-clear. */

const TITLE: Record<HazardKind, string> = {
  alerts: "Weather alerts",
  air: "Air quality",
  facilities: "Nearby help",
  quakes: "Earthquakes",
};
const LOCATE_FAIL: Record<LocateFail, string> = {
  unsupported: "This browser can't share a location.",
  insecure: "Location only works over a secure connection.",
  denied: "Location is off for this site, so nothing was checked. You can allow it in Settings, Safari, Location, or check your search point instead.",
  unavailable: "Your phone couldn't get a fix just now, so nothing was checked. Try again in the open.",
  timeout: "Finding you took too long, so nothing was checked. Try again.",
};
type Results = Partial<{ [K in HazardKind]: HazardResult<K> }>;

const timeText = (at: number) => new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const samePoint = (a: Point, b: Point) => Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

export function HazardPanel({ kinds, point, origin, title = "Live conditions" }: {
  kinds: HazardKind[];
  /** a fixed point (a trailhead): no location needed */
  point?: Point;
  /** the person's last search point, offered as a choice on the Safety page */
  origin?: Point | null;
  title?: string;
}) {
  const [results, setResults] = useState<Results>(() => {
    /* answers kept from an earlier check for the same point, shown with their age */
    const cached = loadCachedHazards();
    const want = point ?? origin;
    const out: Results = {};
    if (want) kinds.forEach((k) => { const c = cached[k]; if (c?.ok && samePoint(c.point, want)) (out as Record<string, unknown>)[k] = c; });
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (p: Point) => {
    setBusy(true); setMsg(null);
    const got = await Promise.all(kinds.map((k) => checkHazard(k, p)));
    setResults((prev) => {
      const next: Results = { ...prev };
      got.forEach((r) => {
        const old = prev[r.kind];
        /* a failed re-check keeps the earlier answer on screen, marked with its age, beside the failure */
        (next as Record<string, unknown>)[r.kind] = r.ok || !old?.ok || !samePoint(old.point, p) ? r : { ...old, failedAgain: r.reason };
      });
      return next;
    });
    setBusy(false);
  };

  const useMine = async () => {
    setBusy(true); setMsg(null);
    const r = await locate();
    if (!r.ok) { setBusy(false); setMsg(LOCATE_FAIL[r.reason]); return; }
    await run({ lat: r.lat, lon: r.lon, label: "Your location" });
  };

  const shown = kinds.map((k) => results[k]).filter(Boolean) as HazardResult<HazardKind>[];

  return (
    <section className="hz" aria-label={title} aria-busy={busy}>
      <h3 className="hz-hd">{title} <span className="hz-net">needs signal</span></h3>
      <p className="quiet small">
        {point ? `Checks ${kinds.map((k) => TITLE[k].toLowerCase()).join(" and ")} for ${point.label}. Nothing is fetched until you tap.`
          : "Only runs when you tap. Your location is asked for only if you choose it, and it goes only to the sources named below."}
      </p>
      <div className="hz-actions">
        {point ? (
          <button type="button" className="pa-btn pa-primary" disabled={busy} onClick={() => run(point)}>{busy ? "Checking…" : shown.length ? "Check again" : "Check now"}</button>
        ) : <>
          {origin && <button type="button" className="pa-btn pa-primary" disabled={busy} onClick={() => run(origin)}>{busy ? "Checking…" : `Check ${origin.label}`}</button>}
          <button type="button" className={"pa-btn" + (origin ? "" : " pa-primary")} disabled={busy} onClick={useMine}>{busy ? "Checking…" : "Use my location"}</button>
        </>}
      </div>
      {msg && <p className="hz-warn" role="alert">{msg}</p>}
      <div aria-live="polite">
        {shown.map((r) => <HazardResultView key={r.kind} r={r} />)}
      </div>
    </section>
  );
}

function Meta({ r }: { r: HazardResult<HazardKind> }) {
  const s = SOURCE[r.kind];
  const stale = isStale(r);
  return (
    <p className="hz-meta">
      {(r.kind === "alerts" || r.kind === "quakes") && <><Tag p="official" />{" "}</>}
      <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · {s.scope} · {r.point.label} · fetched {timeText(r.at)} ({ageText(r.at)})
      {stale && <b className="hz-stale"> Stale: check again before relying on it.</b>}
    </p>
  );
}

function HazardResultView({ r }: { r: HazardResult<HazardKind> & { failedAgain?: string } }) {
  const head = <h4 className="hz-kind">{TITLE[r.kind]}</h4>;
  if (!r.ok) {
    const why = r.reason === "offline" ? "You're offline. Live checks need a connection; the safety guide itself works without one."
      : r.reason === "outside" ? "The National Weather Service covers the US only, so no alerts could be checked for this point."
      : `Couldn't reach ${SOURCE[r.kind].name}. This is not an all-clear: try again when you have better signal.`;
    return <div className="hz-card hz-failed">{head}<p>{why}</p></div>;
  }
  const again = r.failedAgain ? <p className="hz-warn">The latest check failed{r.failedAgain === "offline" ? " (offline)" : ""}. Showing the earlier answer.</p> : null;

  if (r.kind === "alerts") {
    const list = r.data as NwsAlert[];
    return (
      <div className="hz-card">
        {head}{again}
        {list.length === 0 ? (
          <p className="hz-none">No active alerts were returned for this point. That doesn't mean the area is safe: alerts don't cover every hazard, so keep watching the sky and the forecast.</p>
        ) : list.map((a) => (
          <div key={a.id} className={"hz-alert sevb-" + a.severity.toLowerCase()}>
            <p className="hz-alert-hd"><b>{a.event}</b> <span className="hz-sev">{a.severity}</span></p>
            {a.headline && <p>{a.headline}</p>}
            <p className="small quiet">{a.area}{a.ends && ` · until ${new Date(a.ends).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`} · {a.sender}</p>
            {a.instruction && <details><summary>What the NWS says to do</summary><p className="hz-instr">{a.instruction}</p></details>}
          </div>
        ))}
        <Meta r={r} />
      </div>
    );
  }
  if (r.kind === "air") {
    const a = r.data as { aqi: number; pm25: number | null; pm10: number | null };
    const cat = aqiCategory(a.aqi);
    return (
      <div className="hz-card">
        {head}{again}
        <p className="hz-aqi"><b className={"aqi-" + cat.sev}>US AQI {a.aqi}</b> {cat.label} <Tag p="estimate">Model</Tag></p>
        {(a.pm25 != null || a.pm10 != null) && <p className="small quiet">PM2.5 {a.pm25 ?? "unknown"} µg/m³ · PM10 {a.pm10 ?? "unknown"} µg/m³</p>}
        <Meta r={r} />
      </div>
    );
  }
  if (r.kind === "facilities") {
    const list = r.data as { name: string; type: string; phone: string | null; mi: number; lat: number; lon: number }[];
    return (
      <div className="hz-card">
        {head}{again}
        {list.length === 0 ? <p className="hz-none">No hospitals, clinics, ranger, police or fire stations are mapped within 25 km of this point. That says what's on the map, not what's there.</p> : (
          <ul className="hz-list">
            {list.map((f) => (
              <li key={`${f.name}${f.lat}`}>
                <span className="hz-ftype">{f.type}</span>
                <b>{f.name}</b>
                <span className="small quiet">{fmtMi(f.mi)} in a straight line{f.phone && <> · <a href={`tel:${f.phone.replace(/[^\d+]/g, "")}`}>{f.phone}</a></>} · <a href={directionsUrl(f.lat, f.lon)} target="_blank" rel="noreferrer">Directions</a></span>
              </li>
            ))}
          </ul>
        )}
        <Meta r={r} />
      </div>
    );
  }
  const list = r.data as { mag: number; place: string; time: number; url: string; mi: number }[];
  return (
    <div className="hz-card">
      {head}{again}
      {list.length === 0 ? <p className="hz-none">USGS returned no magnitude 2.5+ earthquakes within 300 km in the past week.</p> : (
        <ul className="hz-list">
          {list.map((q) => (
            <li key={q.url || q.time}>
              <b>M {q.mag.toFixed(1)}</b> {q.place}
              <span className="small quiet">{ageText(q.time)} · {fmtMi(q.mi)} away · {q.url && <a href={q.url} target="_blank" rel="noreferrer">USGS details</a>}</span>
            </li>
          ))}
        </ul>
      )}
      <Meta r={r} />
    </div>
  );
}
