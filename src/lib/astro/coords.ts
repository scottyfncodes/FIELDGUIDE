/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
import { DEG, RAD, lst, norm360 } from './julian';

export interface Equatorial {
  /** Right ascension, degrees 0–360. */
  ra: number;
  /** Declination, degrees. */
  dec: number;
}

export interface Horizontal {
  /** Altitude above the horizon, degrees. */
  alt: number;
  /** Azimuth, degrees east of north 0–360. */
  az: number;
}

export interface Ecliptic {
  lon: number;
  lat: number;
}

export function eclipticToEquatorial(e: Ecliptic, obliquityDeg: number): Equatorial {
  const eps = obliquityDeg * DEG;
  const l = e.lon * DEG;
  const b = e.lat * DEG;
  const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
  return { ra: norm360(ra * RAD), dec: dec * RAD };
}

/** Equatorial → horizontal for an observer at (lat, lon east) at Julian Day jd. */
export function toHorizontal(eq: Equatorial, jd: number, lat: number, lon: number): Horizontal {
  const H = (lst(jd, lon) - eq.ra) * DEG;
  const phi = lat * DEG;
  const d = eq.dec * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // Azimuth measured from north through east.
  const y = -Math.sin(H) * Math.cos(d);
  const x = Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(H);
  const az = norm360(Math.atan2(y, x) * RAD);
  return { alt: alt * RAD, az };
}

/** Sixteen-point compass label for an azimuth. */
export function compass(az: number): string {
  const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return names[Math.round(norm360(az) / 22.5) % 16];
}

/** Angular separation in degrees between two equatorial positions. */
export function separation(a: Equatorial, b: Equatorial): number {
  const d1 = a.dec * DEG, d2 = b.dec * DEG, dr = (a.ra - b.ra) * DEG;
  const c = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(dr);
  return Math.acos(Math.max(-1, Math.min(1, c))) * RAD;
}
