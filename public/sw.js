const CACHE_NAME = 'mm-gestao-v1';

// Arquivos para cache inicial
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Ativar imediatamente
  self.skipWaiting();
});

// Ativar e limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Tomar controle de todas as páginas
  self.clients.claim();
});

// Estratégia: Network First, Cache Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorar requisições não-GET
  if (request.method !== 'GET') return;
  
  // Ignorar requisições de API (Supabase)
  if (request.url.includes('supabase.co')) return;
  
  // Ignorar requisições de analytics
  if (request.url.includes('analytics') || request.url.includes('gtag')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Se a resposta for válida, clonar e armazenar no cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar a rede, tentar o cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não estiver no cache e for navegação, retornar a página principal
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Mensagem de atualização disponível
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
