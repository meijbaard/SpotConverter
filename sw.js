// sw.js — Service worker voor SpotConverter
// Strategie:
// - App shell (HTML/CSS/JS/afbeeldingen): cache-first met achtergrond-update (stale-while-revalidate)
// - Databestanden (CSV/JSON): network-first met cache-fallback, zodat data offline
//   beschikbaar blijft maar online altijd vers is.
// Verhoog VERSION bij elke release om oude caches op te ruimen.

const VERSION = 'v4.1.0';
const STATIC_CACHE = `spotconverter-static-${VERSION}`;
const DATA_CACHE = `spotconverter-data-${VERSION}`;

const PRECACHE_URLS = [
  './',
  'index.html',
  'assets/css/spotconverter.css',
  'assets/js/app.js',
  'assets/js/state.js',
  'assets/js/api.js',
  'assets/js/parser.js',
  'assets/js/routing.js',
  'assets/js/message.js',
  'assets/js/ui.js',
  'manifest.json',
  'assets/images/favicon.svg',
  'assets/images/apple-touch-icon.png',
  'assets/images/default-loc.png'
];

const DATA_EXTENSIONS = /\.(csv|json)$/;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DATA_CACHE)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // fonts e.d. aan de browser laten

  // Databestanden: network-first, fallback naar cache (offline in het veld)
  if (DATA_EXTENSIONS.test(url.pathname) && url.pathname !== '/manifest.json') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(DATA_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigatie: network-first, fallback naar gecachte index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Overige statische assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
