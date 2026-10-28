/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
import { moonAltAz, MOON_RISE_ALT } from './moon';
import { sunAltAz, SUN_ALT } from './sun';

/**
 * Generic threshold-crossing solver. Rise/set and twilight are all "when does
 * altitude cross h0", so one careful routine serves the Sun, the Moon, planets
 * and the Milky Way alike. Sampling every `stepMin` minutes then bisecting to
 * ~5 seconds keeps it honest across the pole-ward edge cases (no crossing at
 * all) without the fragile interpolation of the textbook method.
 */
export type AltFn = (jd: number) => number;

export interface Crossing {
  jd: number;
  /** true when altitude goes from below to above the threshold. */
  rising: boolean;
}

export function crossings(alt: AltFn, jdStart: number, jdEnd: number, threshold: number, stepMin = 10): Crossing[] {
  const out: Crossing[] = [];
  const step = stepMin / 1440;
  let t0 = jdStart;
  let a0 = alt(t0) - threshold;
  while (t0 < jdEnd) {
    const t1 = Math.min(t0 + step, jdEnd);
    const a1 = alt(t1) - threshold;
    if ((a0 < 0 && a1 >= 0) || (a0 >= 0 && a1 < 0)) {
      let lo = t0, hi = t1, flo = a0;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const fm = alt(mid) - threshold;
        if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else hi = mid;
      }
      out.push({ jd: (lo + hi) / 2, rising: a1 >= 0 });
    }
    t0 = t1;
    a0 = a1;
  }
  return out;
}

/** First crossing after jdStart in the given direction, or null within the window. */
export function nextCrossing(alt: AltFn, jdStart: number, jdEnd: number, threshold: number, rising: boolean, stepMin = 10): number | null {
  const c = crossings(alt, jdStart, jdEnd, threshold, stepMin).find((x) => x.rising === rising);
  return c ? c.jd : null;
}

export const sunAltFn = (lat: number, lon: number): AltFn => (jd) => sunAltAz(jd, lat, lon).alt;
export const moonAltFn = (lat: number, lon: number): AltFn => (jd) => moonAltAz(jd, lat, lon).alt;

export interface SunTimes {
  sunset: number | null;
  civilDusk: number | null;
  nauticalDusk: number | null;
  astroDusk: number | null;
  astroDawn: number | null;
  nauticalDawn: number | null;
  civilDawn: number | null;
  sunrise: number | null;
}

/**
 * Twilight sequence for the night that begins on the local evening around `jdEvening`
 * (any instant in the afternoon or evening of that day). Searches 24 h forward from noon.
 */
export function sunTimesForNight(jdNoon: number, lat: number, lon: number): SunTimes {
  const f = sunAltFn(lat, lon);
  const end = jdNoon + 1.05;
  const set = (h: number) => nextCrossing(f, jdNoon, end, h, false, 8);
  const rise = (h: number, from: number | null) => nextCrossing(f, from ?? jdNoon + 0.25, end, h, true, 8);
  const sunset = set(SUN_ALT.riseSet);
  const civilDusk = set(SUN_ALT.civil);
  const nauticalDusk = set(SUN_ALT.nautical);
  const astroDusk = set(SUN_ALT.astronomical);
  const astroDawn = rise(SUN_ALT.astronomical, astroDusk ?? nauticalDusk ?? sunset);
  const nauticalDawn = rise(SUN_ALT.nautical, astroDawn ?? nauticalDusk ?? sunset);
  const civilDawn = rise(SUN_ALT.civil, nauticalDawn ?? civilDusk ?? sunset);
  const sunrise = rise(SUN_ALT.riseSet, civilDawn ?? sunset);
  return { sunset, civilDusk, nauticalDusk, astroDusk, astroDawn, nauticalDawn, civilDawn, sunrise };
}

export interface MoonTimes {
  /** Moonrise events within the window, ascending. */
  rises: number[];
  sets: number[];
  /** Whether the moon is above the horizon at the start of the window. */
  upAtStart: boolean;
}

export function moonTimes(jdStart: number, jdEnd: number, lat: number, lon: number): MoonTimes {
  const f = moonAltFn(lat, lon);
  const cs = crossings(f, jdStart, jdEnd, MOON_RISE_ALT, 10);
  return {
    rises: cs.filter((c) => c.rising).map((c) => c.jd),
    sets: cs.filter((c) => !c.rising).map((c) => c.jd),
    upAtStart: f(jdStart) >= MOON_RISE_ALT,
  };
}
