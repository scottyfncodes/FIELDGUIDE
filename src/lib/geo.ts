import type { StartPoint } from "../data/types";

export function haversineMi(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 3958.8, d = Math.PI / 180;
  const dLat = (bLat - aLat) * d, dLon = (bLon - aLon) * d;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * d) * Math.cos(bLat * d) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* Rough mountain-road model: 1.3× straight-line at ~48 mph effective, +8 min to get moving. */
const ROAD_FACTOR = 1.3, ROAD_MPH = 48, START_MIN = 8;

export function driveMin(start: StartPoint | null, to: { lat: number; lon: number } | null): number | null {
  if (!start || !to) return null;
  const road = haversineMi(start.lat, start.lon, to.lat, to.lon) * ROAD_FACTOR;
  return Math.round(START_MIN + (road / ROAD_MPH) * 60);
}

/* Straight-line radius (miles) the model says you can cover in `hours` — the map's drive rings. */
export function ringMiles(hours: number): number {
  return ((hours * 60 - START_MIN) / 60) * ROAD_MPH / ROAD_FACTOR;
}

export function fmtDrive(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.max(5, Math.round(min / 5) * 5)} min`;
  const h = Math.floor(min / 60), m = Math.round((min % 60) / 5) * 5;
  if (m === 0) return `${h} hr`;
  if (m === 60) return `${h + 1} hr`;
  return `${h} hr ${m}`;
}

/* ---------- SUNRISE / SUNSET (NOAA approximation, no API) ---------- */
export function sunTimes(lat: number, lon: number, date = new Date()): { rise: string; set: string } | null {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588, J2000 = 2451545;
  const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
  const lw = -lon * rad, phi = lat * rad;
  const d = toJulian(date) - J2000;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(L) * 0.39778);
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH < -1 || cosH > 1) return null;
  const H = Math.acos(cosH);
  const Jset = J2000 + (0.0009 + (H + lw) / (2 * Math.PI) + n) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  const fmt = (dt: Date) => dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
  return { rise: fmt(fromJulian(Jrise)), set: fmt(fromJulian(Jset)) };
}

/* ---------- DIRECTIONS ----------
   Google Maps HTTPS link to the trailhead coordinates. Opens reliably from
   mobile Safari, Android and desktop, and hands off to the app if installed. */
export function directionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
}
