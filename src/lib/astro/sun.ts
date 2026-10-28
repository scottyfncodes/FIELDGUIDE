/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
import { eclipticToEquatorial, toHorizontal, type Equatorial, type Horizontal } from './coords';
import { centuries, cosD, meanObliquity, norm360, sinD } from './julian';

export interface SunPosition extends Equatorial {
  /** Apparent ecliptic longitude, degrees. */
  lon: number;
  /** Distance, AU. */
  distanceAU: number;
  /** True obliquity used for the conversion, degrees. */
  obliquity: number;
}

/** Apparent geocentric position of the Sun (Meeus ch. 25, low precision: ~0.01°). */
export function sunPosition(jd: number): SunPosition {
  const T = centuries(jd);
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinD(M) + (0.019993 - 0.000101 * T) * sinD(2 * M) + 0.000289 * sinD(3 * M);
  const trueLon = L0 + C;
  const nu = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cosD(nu));
  const Omega = 125.04 - 1934.136 * T;
  const lambda = norm360(trueLon - 0.00569 - 0.00478 * sinD(Omega));
  const eps = meanObliquity(jd) + 0.00256 * cosD(Omega);
  const eq = eclipticToEquatorial({ lon: lambda, lat: 0 }, eps);
  return { ...eq, lon: lambda, distanceAU: R, obliquity: eps };
}

export function sunAltAz(jd: number, lat: number, lon: number): Horizontal {
  return toHorizontal(sunPosition(jd), jd, lat, lon);
}

/** Standard altitude thresholds, degrees. */
export const SUN_ALT = {
  /** Upper limb on the horizon, with refraction. */
  riseSet: -0.8333,
  civil: -6,
  nautical: -12,
  astronomical: -18,
} as const;
