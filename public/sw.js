/* Anonym PWA service worker — offline shell for production only.
 * Never cache Next.js runtime / HMR assets. */
const CACHE = "anonym-shell-v2";
const PRECACHE = [
  "/manifest.webmanifest",
  "/logo.svg",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(url) {
  // Let the browser/network handle Next internals, APIs, auth, websockets.
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.searchParams.has("_rsc")) return true;
  // Hot reload / turbopack
  if (url.pathname.includes("hmr") || url.pathname.includes("webpack")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only same-origin navigations / static shell assets
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) return;

  // Network-first for HTML navigations; do not cache JS chunks here
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((hit) => hit || caches.match("/")),
      ),
    );
    return;
  }

  // Cache-first only for precached static icons / manifest
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            if (res.ok) {
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
