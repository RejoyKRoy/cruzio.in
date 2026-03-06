/* Cruzio Service Worker — PWA + Push Notifications */
const CACHE = 'cruzio-v2';
const SHELL = [
  './',
  './index.html',
  './Cruzio logo.png',
  './Cruzio favicon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Always network for APIs and dynamic sources
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('ipapi.co') ||
      url.hostname.includes('formspree.io') ||
      url.hostname.includes('fonts.g') ||
      url.hostname.includes('onesignal.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response?.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// Handle push events (from OneSignal or Web Push)
self.addEventListener('push', event => {
  let data = { title: 'Cruzio', body: 'You have a new update.' };
  try { data = event.data ? event.data.json() : data; } catch(_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cruzio', {
      body: data.body || '',
      icon: './Cruzio favicon.png',
      badge: './Cruzio favicon.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || './' },
    })
  );
});

// Tap notification → open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = event.notification.data?.url || './';
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
