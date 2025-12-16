// Service Worker para Nodexia Chofer PWA
// Versión: 1.0.0

const CACHE_NAME = 'nodexia-chofer-v1';
const RUNTIME_CACHE = 'nodexia-runtime-v1';

// Recursos para cachear durante la instalación
const PRECACHE_URLS = [
  '/chofer-mobile',
  '/logo X gruesa.png',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching recursos');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de caché: Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Para API y datos dinámicos: Network First
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clonar respuesta para guardar en cache
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Si falla, intentar desde cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para recursos estáticos: Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          // Solo cachear respuestas exitosas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
  );
});

// Sincronización en segundo plano (opcional - para futuro)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-viajes') {
    console.log('[SW] Sincronizando viajes en segundo plano...');
    // Implementar lógica de sincronización
  }
});

// Notificaciones Push (opcional - para futuro)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nuevo viaje asignado',
    icon: '/logo X gruesa.png',
    badge: '/logo X gruesa.png',
    vibrate: [200, 100, 200],
    tag: 'nodexia-notification',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification('Nodexia Chofer', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/chofer-mobile')
  );
});

console.log('[SW] Service Worker cargado exitosamente');
