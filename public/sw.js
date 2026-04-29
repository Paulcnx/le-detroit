// Service worker minimal — pas de cache agressif en développement
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  self.clients.claim();
});
// Toujours aller chercher le réseau — pas de mise en cache
self.addEventListener('fetch', () => {});
