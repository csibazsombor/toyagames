const CACHE_VERSION = 'cikoin-v1';
const ASSETS = [
  '/', 
  '/index.html',

  // JS files
  '/main.js',
  '/three.module.js',

  // Models / textures
  '/assets/character.fbx',
  '/textures/snow.jpg',
];

// Install → store files locally
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('📥 Caching game assets…');
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch → try cache first, else network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request)
        .then(networkResp => {
          // Save new network assets for next time
          return caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, networkResp.clone());
            return networkResp;
          });
        })
      )
  );
});

// Auto clean old versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key =>
        key !== CACHE_VERSION && caches.delete(key)
      ))
    )
  );
});
