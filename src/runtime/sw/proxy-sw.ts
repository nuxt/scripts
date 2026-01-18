/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

export interface SWInterceptRule {
  pattern: string
  target: string
}

// Injected at build time
declare const INTERCEPT_RULES: SWInterceptRule[]

self.addEventListener('install', () => {
  // Take control immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only intercept cross-origin requests
  if (url.origin === self.location.origin)
    return

  // Check if this request matches any intercept rules
  for (const rule of INTERCEPT_RULES) {
    if (url.host === rule.pattern || url.host.endsWith(`.${rule.pattern}`)) {
      // Rewrite to local proxy endpoint
      const proxyUrl = new URL(rule.target + url.pathname + url.search, self.location.origin)

      event.respondWith(
        fetch(proxyUrl.href, {
          method: event.request.method,
          headers: event.request.headers,
          body: event.request.method !== 'GET' && event.request.method !== 'HEAD'
            ? event.request.body
            : undefined,
          credentials: 'same-origin',
          redirect: 'follow',
        }),
      )
      return
    }
  }
})
