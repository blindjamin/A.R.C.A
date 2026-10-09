// Service worker de la PWA. Lo mínimo para que la app sea instalable y no
// muestre el dinosaurio de Chrome sin conexión: las navegaciones van a la red
// y, si no hay red, se responde con el index.html guardado.
// Nunca toca /api (incluida la vuelta de ClaveÚnica): sesión y datos siempre
// van directo al backend, sin caché.
// ponytail: sin caché de assets ni modo offline real; agregarlo (p. ej. con
// vite-plugin-pwa) si los vecinos necesitan usar la app sin señal.
const CACHE = 'arca-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;
  if (new URL(request.url).pathname.startsWith('/api')) return;
  event.respondWith(fetch(request).catch(() => caches.match('/')));
});
