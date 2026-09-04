/* Service Worker - Inventario EQUIPOS PWA
   Estrategia: network-first con fallback a caché para el shell y el login offline mínimo. */
const CACHE = 'inventario-v1'

const PRECACHE = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icons.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No interceptar llamadas a la API: siempre red a la API (el túnel).
  if (url.pathname.startsWith('/api/')) return

  // Solo manejar GET.
  if (request.method !== 'GET') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() =>
        caches.match(request).then((hit) => hit || caches.match('/index.html'))
      )
  )
})