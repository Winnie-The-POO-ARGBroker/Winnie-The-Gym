/**
 * Winnie The Gym — Service Worker (shell cache-first)
 *
 * Strategy: cache-first for the app shell (HTML, CSS, fonts).
 * Network-first for all API requests.
 */

const CACHE_NAME = 'winnie-shell-v1'

// Resources that form the app shell
const SHELL_ASSETS = [
  '/',
  '/index.html',
]

// ── Install: cache the shell ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: cache-first for shell, network-first for API ───────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for everything else (shell assets, JS, CSS, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        // Only cache successful same-origin responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })
        return response
      })
    })
  )
})
