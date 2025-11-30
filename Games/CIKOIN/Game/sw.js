// ======================
// Service Worker Config
// ======================
const CACHE_VERSION = "cikoin-v1.3"; // bump when assets change
const CACHE_NAME = `cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./three.module.js",
  "./assets/character.fbx",
  "./textures/snow.jpg",
];

// Helper — re-download and replace broken cache entries
async function repairCache(request) {
  try {
    const networkResp = await fetch(request, { cache: "no-store" });
    if (networkResp && networkResp.ok) {
      const clone = networkResp.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, clone);
      console.log("🛠 Repaired:", request.url);
      return networkResp;
    }
  } catch (err) {
    console.warn("❌ Repair failed:", request.url, err);
  }
  return null;
}

// ======================
// INSTALL — Pre-cache necessary files
// ======================
self.addEventListener("install", event => {
  console.log("📥 Installing Service Worker…");

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const item of ASSETS) {
        try {
          await cache.add(item);
        } catch {
          console.warn("⚠️ Failed caching:", item, "→ retrying…");
          await repairCache(item);
        }
      }
    })
  );
});

// ======================
// FETCH — Cache-first + auto repair
// ======================
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const cached = await caches.match(request);

    if (cached) {
      const size = cached.headers.get("Content-Length");
      if (!size || size === "0") {
        console.warn("🧹 Corrupt cache → repairing:", request.url);
        const fresh = await repairCache(request);
        return fresh || cached;
      }
      return cached;
    }

    try {
      const networkResp = await fetch(request);

      if (networkResp.ok) {
        const clone = networkResp.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, clone);
      }

      return networkResp;
    } catch {
      return cached; // Offline fallback
    }
  })());
});

// ======================
// ACTIVATE — Take control but DO NOT clear old caches yet!
// ======================
self.addEventListener("activate", event => {
  console.log("⭐ New Service Worker ready (waiting user action)");
  event.waitUntil(self.clients.claim());
});

// ======================
// Manual update trigger (from Update button)
// ======================
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    console.log("🔁 User accepted update → Activating now!");

    self.skipWaiting().then(async () => {
      console.log("♻ Removing old caches…");
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
      console.log("✔ Update applied! Old caches removed.");
    });
  }
});
