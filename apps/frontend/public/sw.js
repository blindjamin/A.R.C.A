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

// Aviso de mensaje nuevo del chat (HU-06). El payload lo arma PushService.
self.addEventListener('push', (event) => {
  const datos = event.data ? event.data.json() : null;
  if (!datos) return;
  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo, icon: '/icono-192.png', badge: '/icono-192.png',
      tag: datos.tag, renotify: true, data: { url: datos.url },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ruta = event.notification.data && event.notification.data.url;
  // Solo rutas propias: nunca abrir un sitio externo desde un aviso.
  // '//evil.com' también empieza con '/': se excluye aparte.
  const propia = typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//');
  const url = new URL(propia ? ruta : '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => 'focus' in v);
      if (abierta) return abierta.focus().then((v) => (v.navigate ? v.navigate(url) : self.clients.openWindow(url)));
      return self.clients.openWindow(url);
    }),
  );
});
