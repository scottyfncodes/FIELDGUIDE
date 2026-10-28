/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
import { eclipticToEquatorial, toHorizontal, type Equatorial, type Horizontal } from './coords';
import { DEG, RAD, centuries, norm360 } from './julian';

/**
 * Bright planets from JPL's approximate Keplerian elements (Standish, "Keplerian
 * Elements for Approximate Positions of the Major Planets", table valid 1800–2050).
 * Good to a fraction of a degree, which is all "Saturn is low in the southeast"
 * needs. Not an ephemeris; labelled `computed` and never used for anything finer.
 */

export type PlanetId = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

interface Elements {
  // a (AU), e, I (deg), L (deg), ϖ (deg), Ω (deg) at J2000, then per-century rates.
  a: number; e: number; I: number; L: number; w: number; O: number;
  da: number; de: number; dI: number; dL: number; dw: number; dO: number;
}

const ELEMENTS: Record<PlanetId | 'earth', Elements> = {
  mercury: { a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.2503235, w: 77.45779628, O: 48.33076593,
    da: 0.00000037, de: 0.00001906, dI: -0.00594749, dL: 149472.67411175, dw: 0.16047689, dO: -0.12534081 },
  venus: { a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.9790995, w: 131.60246718, O: 76.67984255,
    da: 0.0000039, de: -0.00004107, dI: -0.0007889, dL: 58517.81538729, dw: 0.00268329, dO: -0.27769418 },
  earth: { a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, w: 102.93768193, O: 0,
    da: 0.00000562, de: -0.00004392, dI: -0.01294668, dL: 35999.37244981, dw: 0.32327364, dO: 0 },
  mars: { a: 1.52371034, e: 0.0933941, I: 1.84969142, L: -4.55343205, w: -23.94362959, O: 49.55953891,
    da: 0.00001847, de: 0.00007882, dI: -0.00813131, dL: 19140.30268499, dw: 0.44441088, dO: -0.29257343 },
  jupiter: { a: 5.202887, e: 0.04838624, I: 1.30439695, L: 34.39644051, w: 14.72847983, O: 100.47390909,
    da: -0.00011607, de: -0.00013253, dI: -0.00183714, dL: 3034.74612775, dw: 0.21252668, dO: 0.20469106 },
  saturn: { a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, w: 92.59887831, O: 113.66242448,
    da: -0.0012506, de: -0.00050991, dI: 0.00193609, dL: 1222.49362201, dw: -0.41897216, dO: -0.28867794 },
};

export const PLANET_NAMES: Record<PlanetId, string> = {
  mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};

export const PLANETS: PlanetId[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

interface Vec3 { x: number; y: number; z: number }

function heliocentric(el: Elements, T: number): Vec3 {
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = (el.I + el.dI * T) * DEG;
  const L = el.L + el.dL * T;
  const wbar = el.w + el.dw * T;
  const O = (el.O + el.dO * T) * DEG;
  const w = (wbar - el.O - el.dO * T) * DEG; // argument of perihelion
  let M = norm360(L - wbar);
  if (M > 180) M -= 360;
  const Mr = M * DEG;
  // Kepler's equation by Newton iteration.
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 20; i++) {
    const dE = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp,
  };
}

export interface PlanetPosition extends Equatorial {
  id: PlanetId;
  name: string;
  /** Geocentric distance, AU. */
  distanceAU: number;
  /** Elongation from the Sun, degrees. */
  elongation: number;
}

export function planetPosition(id: PlanetId, jd: number): PlanetPosition {
  const T = centuries(jd);
  const p = heliocentric(ELEMENTS[id], T);
  const e = heliocentric(ELEMENTS.earth, T);
  const g = { x: p.x - e.x, y: p.y - e.y, z: p.z - e.z };
  const dist = Math.hypot(g.x, g.y, g.z);
  const lon = norm360(Math.atan2(g.y, g.x) * RAD);
  const lat = Math.asin(g.z / dist) * RAD;
  const eq = eclipticToEquatorial({ lon, lat }, 23.43928);
  // Sun's geocentric longitude is Earth's heliocentric longitude + 180.
  const sunLon = norm360(Math.atan2(-e.y, -e.x) * RAD);
  const elong = Math.abs(((lon - sunLon + 540) % 360) - 180);
  return { id, name: PLANET_NAMES[id], ...eq, distanceAU: dist, elongation: elong };
}

export function planetAltAz(id: PlanetId, jd: number, lat: number, lon: number): Horizontal {
  return toHorizontal(planetPosition(id, jd), jd, lat, lon);
}
