/// <reference lib="webworker" />

const CACHE_NAME = 'incase-emergency-v2';
const API_PREFIX = '/api/v1/emergency/';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

const shouldHandleRequest = (request: Request) => {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  // Cache only emergency API payloads, not UI routes, to avoid stale scan-page layouts.
  return url.pathname.startsWith(API_PREFIX);
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldHandleRequest(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (_err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw _err;
      }
    })()
  );
});
