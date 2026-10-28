/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
import { toHorizontal, type Equatorial, type Horizontal } from './coords';

/** Galactic centre (Sgr A*), J2000. The bright core of the Milky Way sits around it. */
export const GALACTIC_CENTER: Equatorial = { ra: 266.417, dec: -29.008 };

export function galacticCenterAltAz(jd: number, lat: number, lon: number): Horizontal {
  return toHorizontal(GALACTIC_CENTER, jd, lat, lon);
}

/** A few bright deep-sky anchors worth naming when they are up. */
export const ANCHORS: Array<{ id: string; name: string; eq: Equatorial; note: string }> = [
  { id: 'm31', name: 'Andromeda Galaxy', eq: { ra: 10.685, dec: 41.269 }, note: 'Naked-eye smudge from a dark site' },
  { id: 'm45', name: 'Pleiades', eq: { ra: 56.75, dec: 24.117 }, note: 'The Seven Sisters; a binocular showpiece' },
  { id: 'm42', name: 'Orion Nebula', eq: { ra: 83.822, dec: -5.391 }, note: 'Below the three belt stars' },
  { id: 'dcyg', name: 'Cygnus Rift', eq: { ra: 305, dec: 40 }, note: 'The dark lane splitting the summer Milky Way' },
];
