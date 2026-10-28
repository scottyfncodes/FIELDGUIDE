/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
import { eclipticToEquatorial, toHorizontal, type Equatorial, type Horizontal } from './coords';
import { centuries, cosD, deltaT, meanObliquity, norm360, sinD, RAD, DEG } from './julian';
import { sunPosition } from './sun';

/**
 * Geocentric position of the Moon, Meeus ch. 47 (the full ELP-2000/82 truncation
 * printed in Tables 47.A and 47.B). Accuracy ~10″ in longitude, ~4″ in latitude.
 */

// [D, M, M', F, Σl coefficient (1e-6 deg), Σr coefficient (1e-3 km)]
const LR: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

// [D, M, M', F, Σb coefficient (1e-6 deg)]
const B: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

export interface MoonPosition extends Equatorial {
  /** Geocentric ecliptic longitude/latitude, degrees (apparent, with nutation). */
  lon: number;
  lat: number;
  /** Distance Earth–Moon, km. */
  distanceKm: number;
  /** Fraction of the disk illuminated, 0–1. */
  illumination: number;
  /** Phase angle measured from new moon, degrees 0–360 (0 new, 90 first quarter, 180 full). */
  phaseAngle: number;
  /** Elongation from the Sun, degrees 0–180. */
  elongation: number;
  /** Apparent semidiameter, degrees. */
  semidiameter: number;
}

/** Ecliptic geocentric coordinates, from a Julian Day in dynamical time (TT). */
export function moonEclipticTT(jdTT: number): { lon: number; lat: number; distanceKm: number } {
  const T = centuries(jdTT);
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000);
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000);
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000);
  const F = norm360(93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000);
  const A1 = norm360(119.75 + 131.849 * T);
  const A2 = norm360(53.09 + 479264.29 * T);
  const A3 = norm360(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, cl, cr] of LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const k = m === 0 ? 1 : Math.abs(m) === 1 ? E : E2;
    sl += cl * k * sinD(arg);
    sr += cr * k * cosD(arg);
  }
  for (const [d, m, mp, f, cb] of B) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const k = m === 0 ? 1 : Math.abs(m) === 1 ? E : E2;
    sb += cb * k * sinD(arg);
  }
  sl += 3958 * sinD(A1) + 1962 * sinD(Lp - F) + 318 * sinD(A2);
  sb += -2235 * sinD(Lp) + 382 * sinD(A3) + 175 * sinD(A1 - F) + 175 * sinD(A1 + F) + 127 * sinD(Lp - Mp) - 115 * sinD(Lp + Mp);

  const lon = norm360(Lp + sl / 1e6);
  const lat = sb / 1e6;
  const distanceKm = 385000.56 + sr / 1000;
  return { lon, lat, distanceKm };
}

/** Apparent geocentric position of the Moon at a Julian Day in UT. */
export function moonPosition(jd: number): MoonPosition {
  const jdTT = jd + deltaT(jd) / 86400;
  const T = centuries(jdTT);
  const ecl = moonEclipticTT(jdTT);
  // Nutation in longitude (dominant term) and true obliquity.
  const Omega = 125.04452 - 1934.136261 * T;
  const dPsi = -0.004778 * sinD(Omega) - 0.00037 * sinD(2 * norm360(280.4665 + 36000.7698 * T));
  const eps = meanObliquity(jdTT) + 0.00256 * cosD(Omega);
  const lon = norm360(ecl.lon + dPsi);
  const eq = eclipticToEquatorial({ lon, lat: ecl.lat }, eps);

  const sun = sunPosition(jd);
  // Elongation and illuminated fraction (Meeus 48.2, 48.1).
  const cosPsi = cosD(ecl.lat) * cosD(lon - sun.lon);
  const psi = Math.acos(Math.max(-1, Math.min(1, cosPsi)));
  const sunDistKm = sun.distanceAU * 149597870.7;
  const i = Math.atan2(sunDistKm * Math.sin(psi), ecl.distanceKm - sunDistKm * Math.cos(psi));
  const illumination = (1 + Math.cos(i)) / 2;
  const phaseAngle = norm360(lon - sun.lon);
  const semidiameter = Math.asin(1737.4 / ecl.distanceKm) * RAD;
  return { ...eq, lon, lat: ecl.lat, distanceKm: ecl.distanceKm, illumination, phaseAngle, elongation: psi * RAD, semidiameter };
}

/** Topocentric altitude/azimuth: geocentric position corrected for parallax in altitude. */
export function moonAltAz(jd: number, lat: number, lon: number): Horizontal & { distanceKm: number } {
  const m = moonPosition(jd);
  const h = toHorizontal(m, jd, lat, lon);
  const parallax = Math.asin(6378.14 / m.distanceKm) * RAD;
  return { alt: h.alt - parallax * Math.cos(h.alt * DEG), az: h.az, distanceKm: m.distanceKm };
}

/** Geocentric altitude at which the Moon's upper limb appears on the horizon (Meeus 15). */
export const MOON_RISE_ALT = 0.125;

export type PhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

export function phaseName(phaseAngle: number): PhaseName {
  const a = norm360(phaseAngle);
  if (a < 11.25 || a >= 348.75) return 'New Moon';
  if (a < 78.75) return 'Waxing Crescent';
  if (a < 101.25) return 'First Quarter';
  if (a < 168.75) return 'Waxing Gibbous';
  if (a < 191.25) return 'Full Moon';
  if (a < 258.75) return 'Waning Gibbous';
  if (a < 281.25) return 'Last Quarter';
  return 'Waning Crescent';
}

/**
 * Next instant after jd when the phase angle crosses `target` degrees
 * (0 new, 90 first quarter, 180 full, 270 last quarter). Bisection on a
 * monotonic-enough function; accurate to about a minute.
 */
export function nextPhase(jd: number, target: 0 | 90 | 180 | 270): number {
  const f = (t: number) => {
    const a = moonPosition(t).phaseAngle - target;
    return ((a + 540) % 360) - 180; // signed distance to target in (-180, 180]
  };
  // Phase angle advances ~12.19°/day; step forward in 1-day increments to bracket the crossing from negative to positive.
  let a = jd;
  let fa = f(a);
  for (let i = 0; i < 40; i++) {
    const b = a + 1;
    const fb = f(b);
    if (fa < 0 && fb >= 0) {
      let lo = a, hi = b;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    a = b;
    fa = fb;
  }
  return NaN;
}
