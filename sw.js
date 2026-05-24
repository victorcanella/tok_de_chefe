// Marmitaria — Service Worker mínimo
// Cache só do app shell. Dados (Firestore) sempre via rede.
const CACHE_NAME = 'marmitaria-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca cachear Firebase/Firestore/Google APIs
  if (url.hostname.includes('firebaseio.com')
      || url.hostname.includes('googleapis.com')
      || url.hostname.includes('firebase.com')
      || url.hostname.includes('gstatic.com')
      || url.hostname.includes('google.com')) {
    return;
  }
  // Network-first com fallback pro cache (mantém shell offline)
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
  );
});
