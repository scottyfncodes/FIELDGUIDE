/* ---------- DEVICE LOCATION ----------
   Asked for only when the person taps "Use my location". Every way it can
   fail maps to a plain reason the UI can explain, and none of them falls
   back to a guessed town: the caller offers address entry instead. */
export type LocateFail = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";
export type LocateResult =
  | { ok: true; lat: number; lon: number; acc: number; at: number }
  | { ok: false; reason: LocateFail };

/** Beyond this the fix is too rough to rank trails by (cell towers, IP). */
export const ROUGH_ACCURACY_M = 3000;

export const LOCATE_MESSAGE: Record<LocateFail, string> = {
  unsupported: "This browser can't share a location. Type an address or place instead.",
  insecure: "Location only works over a secure connection. Type an address or place instead.",
  denied: "Location is turned off for this site. You can type an address or place instead, or allow location in Settings, Safari, Location.",
  unavailable: "Your phone couldn't get a fix just now. Try again in the open, or type an address or place.",
  timeout: "Finding you took too long. Try again, or type an address or place.",
};

interface GeoLike {
  getCurrentPosition: (ok: PositionCallback, err: PositionErrorCallback, opts?: PositionOptions) => void;
}

export function locate(
  geo: GeoLike | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined,
  secure: boolean = typeof window === "undefined" || window.isSecureContext !== false,
): Promise<LocateResult> {
  if (!secure) return Promise.resolve({ ok: false, reason: "insecure" });
  if (!geo) return Promise.resolve({ ok: false, reason: "unsupported" });
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: LocateResult) => { if (!done) { done = true; resolve(r); } };
    /* Safari sometimes never calls back at all; don't leave the button spinning */
    const guard = setTimeout(() => finish({ ok: false, reason: "timeout" }), 20_000);
    try {
      geo.getCurrentPosition(
        (pos) => {
          clearTimeout(guard);
          const { latitude, longitude, accuracy } = pos.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) finish({ ok: false, reason: "unavailable" });
          else finish({ ok: true, lat: latitude, lon: longitude, acc: Math.round(accuracy || 0), at: pos.timestamp || Date.now() });
        },
        (err) => {
          clearTimeout(guard);
          finish({ ok: false, reason: err?.code === 1 ? "denied" : err?.code === 3 ? "timeout" : "unavailable" });
        },
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60 * 1000 },
      );
    } catch {
      clearTimeout(guard);
      finish({ ok: false, reason: "unavailable" });
    }
  });
}
