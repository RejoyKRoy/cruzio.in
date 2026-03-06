/* Cruzio Service Worker — Feature 19: PWA */
const CACHE = 'cruzio-v1';
const SHELL = [
  './',
  './index.html',
  './Cruzio logo.png',
  './Cruzio favicon.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.13/flatpickr.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
];

// Install: cache shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(SHELL.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for Supabase API, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network for Supabase, formspree, fonts (dynamic data)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('formspree.io') ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic')
  ) {
    return; // fall through to network
  }

  // Cache-first for everything else (static assets)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful GET responses
        if (event.request.method === 'GET' && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => cached); // serve stale if offline
    })
  );
});
