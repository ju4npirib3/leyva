const CACHE = 'kashnubix-v3';

// On install: activate immediately — don't wait for old tabs to close
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Message from page: skip waiting and take control
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Ignore non-GET and cross-origin requests
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Navigation (HTML pages): always fetch from network to get latest version
  // Falls back to cache if offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Next.js static assets (_next/static) are content-hashed → safe to cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Everything else: network first
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
