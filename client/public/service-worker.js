const CACHE_NAME = 'construction-360-cache-v2';
const ASSETS = ['/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const reqUrl = new URL(url);

  // Never cache API / Cloud Functions / Firebase Storage - always go to network (avoids CORS issues)
  if (
    url.includes('cloudfunctions.net') ||
    url.includes('firebaseapp.com') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('supabase.co') ||
    url.includes('/api/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(null, { status: 408, statusText: 'Network Error' });
      })
    );
    return;
  }

  // For SPA navigations, always try network first to avoid stale index.html
  // (stale HTML can point to old hashed JS and cause a black screen on mobile).
  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      reqUrl.origin === self.location.origin &&
      (reqUrl.pathname === '/' || reqUrl.pathname.endsWith('.html')));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          }).catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
        })
    );
    return;
  }

  // Everything else: cache-first; avoid unhandled rejection if fetch fails.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => new Response(null, { status: 408, statusText: 'Network Error' }));
    }).catch(() => new Response(null, { status: 408, statusText: 'Network Error' }))
  );
});

