/**
 * Nuxt Scripts Service Worker - intercepts analytics requests
 *
 * Injected at runtime:
 * - INTERCEPT_RULES: Array<{ pattern: string, pathPrefix: string, target: string }>
 */

/* global INTERCEPT_RULES */

self.addEventListener('install', () => {
  // console.log('[nuxt-scripts-sw] Installing...');
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // console.log('[nuxt-scripts-sw] Activating...');
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only intercept cross-origin requests
  if (url.origin === self.location.origin) return

  for (const rule of INTERCEPT_RULES) {
    const hostMatches = url.host === rule.pattern || url.host.endsWith('.' + rule.pattern)
    // Check if path prefix matches (if one is required)
    const pathMatches = !rule.pathPrefix || url.pathname.startsWith(rule.pathPrefix)

    if (hostMatches && pathMatches) {
      // Strip path prefix from the original URL path before building proxy URL
      const strippedPath = rule.pathPrefix
        ? url.pathname.slice(rule.pathPrefix.length) || '/'
        : url.pathname

      // console.log('[nuxt-scripts-sw] Intercepting:', url.href, '->', rule.target + strippedPath);

      const proxyUrl = new URL(rule.target + strippedPath + url.search, self.location.origin)
      const clonedRequest = event.request.clone()
      event.respondWith(
        fetch(proxyUrl.href, {
          method: clonedRequest.method,
          headers: clonedRequest.headers,
          body: clonedRequest.method !== 'GET' && clonedRequest.method !== 'HEAD' ? clonedRequest.body : undefined,
          credentials: 'same-origin',
          redirect: 'follow',
        }),
      )
      return
    }
  }
})
