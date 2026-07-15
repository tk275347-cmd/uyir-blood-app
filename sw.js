/* இரத்த தான ஆப் — Service Worker (PWA offline support), v4 hardened */
'use strict';

/* Bump the cache name whenever the app shell changes so old caches are purged. */
/* Cache version — bump on every release to invalidate old caches */
const CACHE_NAME = 'blood-donation-v10';

/* App shell — install ஆகும்போது pre-cache செய்யப்படும் core files */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

/* Install: app shell-ஐ pre-cache செய்து உடனே activate ஆகு */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => { /* one asset failing must not block install */ })
  );
});

/* Activate: பழைய cache-களை நீக்கி control-ஐ எடு */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch strategy:
   - GET மட்டுமே handle செய் (POST/PUT முதலியன network-க்கு விடு)
   - Page navigation → network-first, offline-ல் cached index.html fallback
   - மற்ற same-origin resources → cache-first, பிறகு network (fetched-ஐ cache) */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  /* Page navigation (SPA shell) — network-first with offline fallback */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Other resources — cache-first, then network; cache same-origin responses */
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        /* Cache only successful, same-origin, basic responses (avoid opaque bloat) */
        if (res && res.status === 200 && res.type === 'basic') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(req, resClone); } catch (e) { /* ignore */ }
          });
        }
        return res;
      }).catch(() => cached);
    })
  );
});
