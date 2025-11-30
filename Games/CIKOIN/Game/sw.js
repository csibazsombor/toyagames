// ======================
// Service Worker Config
// ======================
const CACHE_VERSION = "cikoin-v7"; // bump this when you update the game
const CACHE_NAME = `cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./three.module.js",
  "./assets/character.fbx",
  "./textures/snow.jpg",
];

// ======================
// INSTALL — Cache assets
// ======================
self.addEventListener("install", event => {
  console.log("📥 Installing Service Worker…");
  self.skipWaiting(); // Allow immediate activation

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn("⚠️ Asset caching issue:", err);
      });
    })
  );
});

// ======================
// FETCH — Stale-while-revalidate
// ======================
self.addEventListener("fetch", event => {
  const request = event.request;

  // Only cache GET requests (avoid Firebase errors)
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(networkResp => {
          // Don’t cache failed responses
          if (!networkResp || networkResp.status !== 200) {
            return networkResp;
          }

          // Clone response BEFORE streaming it
          const cloneResp = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cloneResp);
          });

          return networkResp;
        })
        .catch(() => cached); // If offline → use cache

      return cached || networkFetch;
    })
  );
});

// ======================
// ACTIVATE — Remove old caches
// ======================
self.addEventListener("activate", event => {
  console.log("♻ Cleaning old caches…");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ======================
// SUPPORT UPDATE POPUP
// ======================
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    console.log("⏭ Skip waiting: Activating update");
    self.skipWaiting();
  }
});
