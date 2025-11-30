const CACHE_VERSION = "cikoin-v4";
const CACHE_NAME = `cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./three.module.js",
  "./assets/character.fbx",
  "./textures/snow.jpg",
];

// Install → Pre-cache core assets
self.addEventListener("install", e => {
  self.skipWaiting(); // Force new SW to activate immediately

  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📥 Pre-caching game assets…");
      return cache.addAll(ASSETS).catch(err => {
        console.warn("⚠️ Some assets failed to cache:", err);
      });
    })
  );
});

// Fetch → Stale-while-revalidate strategy
self.addEventListener("fetch", e => {
  const request = e.request;

  // Only cache GET requests (safety)
  if (request.method !== "GET") return;

  e.respondWith(
    caches.match(request).then(cached => {
      const fetchAndUpdate = fetch(request)
        .then(networkResp => {
          if (!networkResp || networkResp.status !== 200) {
            return networkResp;
          }

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResp.clone());
          });

          return networkResp;
        })
        .catch(() => cached); // fallback to cache if offline

      // Prefer cache first, update silently for next time
      return cached || fetchAndUpdate;
    })
  );
});

// Activation → Remove old cache versions
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // instantly control existing pages
  );
});

// Optional: notify pages when update available
self.addEventListener("message", event => {
  if (event.data === "checkForUpdate") {
    self.skipWaiting();
  }
});
