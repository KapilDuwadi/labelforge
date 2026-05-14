const APP_CACHE = 'labelforge-app-v4';
const CDN_CACHE = 'labelforge-cdn-v4';

const APP_SHELL = [
  '/labelforge/',
  '/labelforge/index.html',
  '/labelforge/manifest.json',
  '/labelforge/icons/icon.svg',
];

const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

// Install: cache app shell, then best-effort cache CDN assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() =>
        caches.open(CDN_CACHE).then(cache =>
          Promise.allSettled(CDN_URLS.map(url => cache.add(url)))
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  const KEEP = [APP_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   CDN requests  → network first, cache fallback
//   Local requests → cache first, network fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin !== location.origin) {
    // CDN: try network, update cache, fall back to cached copy
    event.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        fetch(event.request)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Local: serve from cache, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
