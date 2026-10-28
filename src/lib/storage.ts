/* Local persistence. Everything lives in localStorage on this device; every
   access is guarded because Safari private mode, blocked site data and quota
   errors all throw. (The app originally targeted a sandbox-only
   `window.storage` API, which doesn't exist on the deployed site.) */
export const LOG_KEY = "co-trail-log-v1";
export const WX_KEY = "co-trail-wx-v2";
/** the last search point: { key: "gps" | "place", label, lat, lon } (older builds stored a preset town here) */
export const START_KEY = "co-trail-start-v1";
export const RADIUS_KEY = "co-field-radius-v1";

export function loadKey<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveKey(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
