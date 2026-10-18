/**
 * Winnie The Gym — Service Worker
 *
 * Strategy:
 * - Page navigations (HTML): network-first. The shell is only used as an offline
 *   fallback, so a new deploy reaches returning visitors on their next visit.
 *   Serving it cache-first froze every visitor on the bundle of the day they
 *   first opened the app.
 * - /assets/*: cache-first. Vite names them with a content hash, so a cached
 *   file can never be stale.
 * - API calls and everything else: network-first, cache as a fallback.
 *
 * Bump CACHE_NAME to drop everything cached by older versions of this worker.
 */

const CACHE_NAME = 'winnie-shell-v2'
const SHELL_URL = '/index.html'

// ── Install: take over right away ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(Promise.resolve(self.skipWaiting()))
})

// ── Activate: drop old caches (v1 kept serving a stale index.html) ────────────
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

function isCacheable(response) {
  return Boolean(response) && response.status === 200 && response.type === 'basic'
}

// respondWith() needs a Response: when the network fails and nothing is cached,
// answer with a network error instead of undefined ("Failed to convert value to
// 'Response'").
async function fromCacheOrError(key) {
  return (await caches.match(key)) || Response.error()
}

function remember(key, response) {
  if (!isCacheable(response)) return
  const copy = response.clone()
  caches.open(CACHE_NAME).then((cache) => cache.put(key, copy))
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Page navigations: network first, cached shell only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          remember(SHELL_URL, response)
          return response
        })
        .catch(() => fromCacheOrError(SHELL_URL))
    )
    return
  }

  // Hashed build output: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            remember(request, response)
            return response
          })
          .catch(() => Response.error())
      })
    )
    return
  }

  // API calls and the rest: network first.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/ws/')) {
          remember(request, response)
        }
        return response
      })
      .catch(() => fromCacheOrError(request))
  )
})
