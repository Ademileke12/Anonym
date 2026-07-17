/* Anonym PWA service worker — offline shell for mobile clients */
const CACHE = "anonym-shell-v1";
const PRECACHE = ["/", "/app", "/manifest.webmanifest", "/logo.svg", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Network-first for app routes; cache fallback for shell
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && request.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
  );
});
