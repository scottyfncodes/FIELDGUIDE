import { fromJD, toJD } from "./astro/julian";
import { moonTimes, sunTimesForNight } from "./astro/events";
import { moonPosition, phaseName } from "./astro/moon";
import type { PhaseName } from "./astro/moon";
import { localDateOf, zonedToUtc } from "./astro/time";

/* ---------- TONIGHT'S SKY ----------
   The computed half of LOOKUP, for any place in the atlas: darkness and the
   Moon. All of it is astronomy (LOOKUP's "computed" label), worked out on the
   phone with no network. It is not LOOKUP's full go/no-go call, which also
   needs the cloud forecast and the drive; the place page links to LOOKUP for that. */
const TZ = "America/Denver";

export interface Tonight {
  sunset: number | null;
  /** astronomical darkness begins / ends (ms); null when it never gets fully dark */
  darkStart: number | null;
  darkEnd: number | null;
  sunrise: number | null;
  /** 0–1 at the middle of the night */
  illumination: number;
  phase: PhaseName;
  moonRise: number | null;
  moonSet: number | null;
  /** minutes of full darkness with the Moon below the horizon */
  moonFreeMinutes: number;
}

const ms = (jd: number | null) => (jd == null ? null : fromJD(jd).getTime());

export function tonightAt(lat: number, lon: number, now = new Date()): Tonight {
  const d = localDateOf(now.getTime(), TZ);
  /* before about 6 AM, "tonight" is the night already in progress */
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(now));
  const noon = zonedToUtc(d.year, d.month, d.day, 12, 0, TZ) - (hour < 6 ? 86_400_000 : 0);
  const jdNoon = toJD(new Date(noon));
  const sun = sunTimesForNight(jdNoon, lat, lon);
  const startJd = sun.sunset ?? jdNoon + 0.25;
  const endJd = sun.sunrise ?? jdNoon + 0.75;
  const mid = (startJd + endJd) / 2;
  const mp = moonPosition(mid);
  const mt = moonTimes(startJd, endJd, lat, lon);

  let moonFree = 0;
  if (sun.astroDusk != null && sun.astroDawn != null) {
    const step = 10 / 1440;
    const moonUp = (jd: number) => {
      /* walk the rise/set events: up at start, toggled at each crossing before jd */
      const events = [...mt.rises.map((t) => ({ t, up: true })), ...mt.sets.map((t) => ({ t, up: false }))]
        .filter((e) => e.t <= jd).sort((a, b) => a.t - b.t);
      return events.length ? events[events.length - 1].up : mt.upAtStart;
    };
    for (let jd = sun.astroDusk; jd < sun.astroDawn; jd += step) if (!moonUp(jd)) moonFree += 10;
  }

  return {
    sunset: ms(sun.sunset), darkStart: ms(sun.astroDusk), darkEnd: ms(sun.astroDawn), sunrise: ms(sun.sunrise),
    illumination: mp.illumination, phase: phaseName(mp.phaseAngle),
    moonRise: ms(mt.rises[0] ?? null), moonSet: ms(mt.sets[0] ?? null),
    moonFreeMinutes: moonFree,
  };
}

export const fmtClock = (t: number | null) =>
  t == null ? "none" : new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(t));
