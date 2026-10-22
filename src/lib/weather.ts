import type { Trail, Verdict, Weather } from "../data/types";

/* ---------- FORECAST ----------
   Open-Meteo: free, no key. One batched request for every trailhead
   (comma-joined coordinate lists), so each verdict reflects that trailhead's
   own grid cell — a pass or a basin, not the nearest town. */
export interface WxPayload { ts: number; day: string; byTrail: Record<string, Weather> }

export const todayKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });

/* A cached forecast is good for the same Colorado calendar day, up to 3 hours old. */
export function isFresh(p: WxPayload | null, now = Date.now()): p is WxPayload {
  return !!p && !!p.byTrail && p.day === todayKey(new Date(now)) && now - p.ts < 1000 * 60 * 60 * 3;
}

export function forecastUrl(trails: Trail[]): string {
  const lats = trails.map((t) => t.lat.toFixed(4)).join(",");
  const lons = trails.map((t) => t.lon.toFixed(4)).join(",");
  return "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lats}&longitude=${lons}` +
    "&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max,weather_code" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDenver&forecast_days=1";
}

/* WMO weather codes -> short human summary */
export function wmo(c: number | undefined): string {
  if (c == null) return "Mixed conditions";
  if (c === 0) return "Clear";
  if (c === 1 || c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c >= 51 && c <= 57) return "Drizzle";
  if (c >= 61 && c <= 67) return "Rain";
  if (c >= 71 && c <= 77) return "Snow";
  if (c >= 80 && c <= 82) return "Rain showers";
  if (c >= 85 && c <= 86) return "Snow showers";
  if (c >= 95) return "Thunderstorms";
  return "Mixed conditions";
}

/* Open-Meteo returns an array for multiple coordinates, a single object for one. */
export function parseForecast(data: unknown, trails: Trail[]): Record<string, Weather> {
  const list = (Array.isArray(data) ? data : [data]) as any[];
  const out: Record<string, Weather> = {};
  trails.forEach((t, i) => {
    const d = list[i]?.daily;
    if (!d) return;
    const hi = d.temperature_2m_max?.[0], lo = d.temperature_2m_min?.[0];
    if (typeof hi !== "number" || typeof lo !== "number") return;
    const wind = Math.round(Math.max(d.wind_gusts_10m_max?.[0] ?? 0, d.wind_speed_10m_max?.[0] ?? 0));
    out[t.id] = {
      hi: Math.round(hi), lo: Math.round(lo), wind,
      precip: Math.round(d.precipitation_probability_max?.[0] ?? 0),
      summary: wmo(d.weather_code?.[0]),
    };
  });
  return out;
}

export async function fetchForecast(trails: Trail[], fetchImpl: typeof fetch = fetch): Promise<WxPayload> {
  const res = await fetchImpl(forecastUrl(trails));
  if (!res.ok) throw new Error("weather http " + res.status);
  const byTrail = parseForecast(await res.json(), trails);
  if (!Object.keys(byTrail).length) throw new Error("no forecast parsed");
  return { ts: Date.now(), day: todayKey(), byTrail };
}

/* ---------- VERDICT ---------- */
export function verdict(w: Weather | null | undefined): Verdict | null {
  if (!w) return null;
  const { hi, wind, precip } = w;
  if (precip >= 50 || wind >= 30 || hi <= 15 || hi >= 95) return "POOR";
  if (precip >= 30 || wind >= 20 || hi <= 25 || hi >= 88) return "FAIR";
  return "GOOD";
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  GOOD: "Good day to hike",
  FAIR: "Hikeable, watch conditions",
  POOR: "Rough day, consider another trail",
};
