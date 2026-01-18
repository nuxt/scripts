import { defineEventHandler, setResponseHeader } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const proxyConfig = config['nuxt-scripts-proxy'] as { routes: Record<string, string> } | undefined
  const routes = proxyConfig?.routes || {}

  // Convert routes to SW intercept rules
  // Extract domain and optional path prefix from proxy URL
  // e.g., "https://www.facebook.com/tr/**" -> pattern="www.facebook.com", pathPrefix="/tr"
  const rules = Object.entries(routes).map(([localPath, proxy]) => {
    const match = proxy.match(/^https?:\/\/([^/]+)(\/[^*]*)?\*\*$/)
    if (!match)
      return null
    return {
      pattern: match[1],
      pathPrefix: match[2] || '', // Path prefix like "/tr" for facebook.com/tr
      target: localPath.replace(/\/\*\*$/, ''),
    }
  }).filter(Boolean)

  // Set proper headers for service worker
  setResponseHeader(event, 'Content-Type', 'application/javascript')
  setResponseHeader(event, 'Service-Worker-Allowed', '/')
  setResponseHeader(event, 'Cache-Control', 'no-cache')

  return `// Nuxt Scripts Service Worker - intercepts analytics requests
const INTERCEPT_RULES = ${JSON.stringify(rules)};

self.addEventListener('install', () => {
  console.log('[nuxt-scripts-sw] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[nuxt-scripts-sw] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Log cross-origin requests for debugging
  if (url.origin !== self.location.origin) {
    console.log('[nuxt-scripts-sw] Cross-origin request:', url.host, url.pathname);
  }

  if (url.origin === self.location.origin) return;

  for (const rule of INTERCEPT_RULES) {
    const hostMatches = url.host === rule.pattern || url.host.endsWith('.' + rule.pattern);
    // Check if path prefix matches (if one is required)
    const pathMatches = !rule.pathPrefix || url.pathname.startsWith(rule.pathPrefix);

    if (hostMatches && pathMatches) {
      // Strip path prefix from the original URL path before building proxy URL
      const strippedPath = rule.pathPrefix
        ? url.pathname.slice(rule.pathPrefix.length) || '/'
        : url.pathname;
      console.log('[nuxt-scripts-sw] Intercepting:', url.href, '->', rule.target + strippedPath);
      const proxyUrl = new URL(rule.target + strippedPath + url.search, self.location.origin);
      event.respondWith(
        fetch(proxyUrl.href, {
          method: event.request.method,
          headers: event.request.headers,
          body: event.request.method !== 'GET' && event.request.method !== 'HEAD' ? event.request.body : undefined,
          credentials: 'same-origin',
          redirect: 'follow',
        })
      );
      return;
    }
  }
});
`
})
