// Monetag Adaptive & Push Service Worker
// Zone ID: 12339769 | Domain: 3nbf4.com
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 12339769
};
self.lary = "";

// Import Monetag Official Service Worker Script safely
try {
  importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');
} catch (err) {
  console.warn('[SW-2] Monetag service worker import warning:', err);
}

// Progressive Web App & Offline Caching Integration
const CACHE_NAME = 'millionaire-adaptive-v2';
const PRECACHE_ASSETS = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/js/reward-system.js',
  '/assets/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'millionaire-v1') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for internal same-origin resources
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache external ad network requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});
