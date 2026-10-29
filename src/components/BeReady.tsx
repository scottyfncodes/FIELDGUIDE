import { contextLinks } from "../lib/safety";
import { useActions } from "./PlaceSections";
import { HazardPanel } from "./HazardPanel";
import { Tag } from "./atlasBits";

/* ---------- BE READY: the safety guide from a place page ----------
   Two different kinds of thing, labelled apart: general reading from the
   Safety & Survival guide (the same for every trail, works offline), and an
   opt-in live check of official alerts and modelled air quality for this
   exact point. Nothing here claims to know the trail's hazards. */
export function BeReady({ lat, lon, label, vehicleNote }: { lat: number; lon: number; label: string; vehicleNote?: string | null }) {
  const act = useActions();
  const links = contextLinks({ month: new Date().getMonth() + 1, vehicleNote });
  return (
    <section className="det-sec be-ready" aria-label="Be ready">
      <h3>Be ready <Tag p="general" /></h3>
      <p className="quiet small">General reading from the Safety &amp; Survival guide, not about this place in particular. It works with no signal.</p>
      <div className="ready-links">
        {links.map((l) => <button key={l.label} type="button" className="ready-link" onClick={() => act.openSafety(l.route)}>{l.label}</button>)}
        <button type="button" className="ready-link ready-all" onClick={() => act.openSafety({})}>All of Safety &amp; Survival</button>
      </div>
      <HazardPanel kinds={["alerts", "air"]} point={{ lat, lon, label }} title="Alerts here" />
    </section>
  );
}
