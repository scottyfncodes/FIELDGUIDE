/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
/** Time scales. Everything downstream works in Julian Days (UT); no local time here. */

export const J2000 = 2451545.0;
export const DAY_MS = 86_400_000;

export function toJD(date: Date): number {
  return date.getTime() / DAY_MS + 2440587.5;
}

export function fromJD(jd: number): Date {
  return new Date((jd - 2440587.5) * DAY_MS);
}

/** Julian centuries from J2000.0. */
export function centuries(jd: number): number {
  return (jd - J2000) / 36525;
}

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function norm360(d: number): number {
  const x = d % 360;
  return x < 0 ? x + 360 : x;
}

export function norm180(d: number): number {
  const x = norm360(d);
  return x > 180 ? x - 360 : x;
}

export const sinD = (d: number) => Math.sin(d * DEG);
export const cosD = (d: number) => Math.cos(d * DEG);

/** Greenwich mean sidereal time in degrees (Meeus 12.4). */
export function gmst(jd: number): number {
  const T = centuries(jd);
  const th = 280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return norm360(th);
}

/** Local sidereal time in degrees for an east-positive longitude. */
export function lst(jd: number, lonDeg: number): number {
  return norm360(gmst(jd) + lonDeg);
}

/** Mean obliquity of the ecliptic, degrees (Meeus 22.2). */
export function meanObliquity(jd: number): number {
  const T = centuries(jd);
  return 23.43929111 - (46.815 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
}

/**
 * Approximate ΔT (TT − UT) in seconds, good to a few seconds for 1980–2050.
 * Only matters for the Moon, and even there only at the arc-second level.
 */
export function deltaT(jd: number): number {
  const y = 2000 + (jd - J2000) / 365.25;
  if (y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  return 62.92 + 0.32217 * 50 + 0.005589 * 2500 + (y - 2050) * 0.6;
}
