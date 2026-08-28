// DropLync High-Performance Service Worker
const CACHE_NAME = 'droplync-v1.0.1'
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
]

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch Event - Network first with offline fallback for navigation, cache-first for static icons
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never cache or interfere with chunk uploads, API calls, or non-GET requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return
  }

  // Static assets: cache-first
  if (url.pathname.match(/\.(svg|png|jpg|jpeg|webp|woff2|css|js)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // HTML / Page Navigation: Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/')
        })
      })
  )
})
