// ======================
// Service Worker Config
// ======================
const CACHE_VERSION = "cikoin-v1.8"; // bump when assets change
const CACHE_NAME = `cache-${CACHE_VERSION}`;

// Precache only the most important core files
// Everything else will be auto-cached whenever requested
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./sw.js"
];


// ======================
// INSTALL — Pre-cache core
// ======================
self.addEventListener("install", event => {
  console.log("📥 Installing Service Worker...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📦 Caching core files...");
      return cache.addAll(CORE_ASSETS);
    })
  );

  self.skipWaiting(); // instantly activate new version
});


// ======================
// FETCH — Cache-first for everything from YOUR DOMAIN
// Avoid caching external resources like Firebase (online only)
// ======================
self.addEventListener("fetch", event => {
  const req = event.request;

  // Only cache local assets from this origin
  if (!req.url.startsWith(self.location.origin)) {
    return; // Firebase + CDN = always online
  }

  event.respondWith(
    caches.match(req).then(cacheResp =>
      cacheResp ||
      fetch(req, { cache: "no-store" }).then(networkResp => {
        // Only cache successful responses
        if (networkResp && networkResp.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkResp.clone());
          });
        }
        return networkResp;
      }).catch(() => cacheResp) // fallback offline
    )
  );
});


// ======================
// ACTIVATE — Cleanup old caches
// ======================
self.addEventListener("activate", event => {
  console.log("✨ Activating new Service Worker...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});


// ======================
// Manual update trigger from UI button
// ======================
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    console.log("🔁 Forcing SW update...");
    self.skipWaiting();
  }
});
