/* Field Guide service worker: keeps the app usable with no signal.
   - Install: precaches the whole build (page, scripts, styles, icons), so the
     app and its Safety & Survival guide open offline after one visit. If any
     file fails to download, the install fails and the previous version stays
     in charge: never half a new app.
   - Pages: network first (so deploys show up), with a short timeout so a weak
     trailhead signal falls back to the saved copy instead of hanging.
   - Built assets (hashed filenames), icons, fonts: cache first.
   - Live data (forecast, alerts, trail sources, iNaturalist) is never cached
     here; the app keeps its own dated copies.
   - /api/ (the identify function) always goes to the network.
   BUILD and PRECACHE are filled in by the build (vite.config.ts); in dev they
   keep these defaults. */
const BUILD = "dev";
const PRECACHE = [];
const CACHE = "field-guide-" + BUILD;
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-180.png"];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll([...new Set([...SHELL, ...PRECACHE])]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function fromNetworkWithin(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(req).then((res) => { clearTimeout(t); resolve(res); }, (err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fromNetworkWithin(req, NAV_TIMEOUT_MS)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit || fetch(req))),
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;
  if (sameOrigin && url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
    ),
  );
});
