// Monetag Official Verification & PWA Service Worker
// موقع مليونير | Millionaire Portal

const CACHE_NAME = 'millionaire-v1';
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/i18n.js',
  '/js/main.js',
  '/assets/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for Monetag Ads & APIs, Cache-fallback for static UI
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch ads & APIs live directly from network
  if (url.pathname.startsWith('/api') || url.hostname.includes('monetag') || url.hostname.includes('google') || url.hostname.includes('alwingulla')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{"error":"offline"}')));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
