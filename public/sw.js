const CACHE_NAME = 'mm-gestao-v2';
const APP_SHELL_CACHE = 'mm-gestao-shell-v2';
const RUNTIME_CACHE = 'mm-gestao-runtime-v2';

// Core app shell - these get precached on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/placeholder.svg'
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const validCaches = [APP_SHELL_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !validCaches.includes(k))
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip Supabase API calls, analytics, chrome-extension
  const url = new URL(request.url);
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.protocol === 'chrome-extension:' ||
    url.pathname.includes('analytics') ||
    url.pathname.includes('gtag')
  ) return;

  // NAVIGATION requests (HTML pages) → always serve index.html from cache when offline
  // This is the KEY fix: SPA routes like /kiosk need index.html, not a server response
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh index.html
          const clone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => {
          // Offline: serve cached index.html for ANY navigation
          console.log('[SW] Offline navigation fallback → index.html');
          return caches.match('/index.html').then((cached) => {
            return cached || new Response(
              '<html><body><h1>Offline</h1><p>Sem conexão e sem cache disponível.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // JS/CSS/assets → Cache-first with network fallback (for hashed Vite chunks)
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Images/SVG/other assets → Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || new Response('', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Report SW status
  if (event.data && event.data.type === 'GET_SW_STATUS') {
    caches.keys().then((keys) => {
      const status = {
        version: CACHE_NAME,
        caches: keys,
        timestamp: new Date().toISOString(),
      };
      event.ports[0]?.postMessage(status);
    });
  }
});
