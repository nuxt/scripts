import { defineEventHandler, getHeaders, getRequestIP, readBody, getQuery, setResponseHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useStorage, useNitroApp } from 'nitropack/runtime'
import { hash } from 'ohash'
import { rewriteScriptUrls } from '../utils/pure'
import {
  FINGERPRINT_HEADERS,
  IP_HEADERS,
  SENSITIVE_HEADERS,
  anonymizeIP,
  normalizeLanguage,
  normalizeUserAgent,
  stripPayloadFingerprinting,
} from './utils/privacy'

interface ProxyConfig {
  routes: Record<string, string>
  privacy: 'anonymize' | 'proxy'
  rewrites?: Array<{ from: string, to: string }>
  /** Cache duration for JavaScript responses in seconds (default: 3600 = 1 hour) */
  cacheTtl?: number
  /** Enable verbose logging (default: only in dev) */
  debug?: boolean
}

/**
 * Strip fingerprinting from URL query string.
 */
function stripQueryFingerprinting(
  query: Record<string, unknown>,
): string {
  const stripped = stripPayloadFingerprinting(query)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(stripped)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

/**
 * Privacy-aware proxy handler for first-party script collection endpoints.
 * Routes requests to third-party analytics while protecting user privacy.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const nitro = useNitroApp()
  const proxyConfig = config['nuxt-scripts-proxy'] as ProxyConfig | undefined

  if (!proxyConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: 'First-party proxy not configured',
    })
  }

  const { routes, privacy, cacheTtl = 3600, debug = import.meta.dev } = proxyConfig
  const path = event.path
  const log = debug
    ? (message: string, ...args: any[]) => {
        // eslint-disable-next-line no-console
        console.debug(message, ...args)
      }
    : () => {}

  // Find matching route (sort by length descending to match longest/most specific first)
  let targetBase: string | undefined
  let matchedPrefix: string | undefined

  const sortedRoutes = Object.entries(routes).sort((a, b) => b[0].length - a[0].length)
  for (const [routePattern, target] of sortedRoutes) {
    // Convert route pattern to prefix (remove /** suffix)
    const prefix = routePattern.replace(/\/\*\*$/, '')
    if (path.startsWith(prefix)) {
      targetBase = target.replace(/\/\*\*$/, '')
      matchedPrefix = prefix
      log('[proxy] Matched:', prefix, '->', targetBase)
      break
    }
  }

  if (!targetBase || !matchedPrefix) {
    log('[proxy] No match for path:', path)
    throw createError({
      statusCode: 404,
      statusMessage: 'No proxy route matched',
      message: `No proxy target found for path: ${path}`,
    })
  }

  // Build target URL with stripped query params
  let targetPath = path.slice(matchedPrefix.length)
  // Ensure path starts with /
  if (targetPath && !targetPath.startsWith('/')) {
    targetPath = '/' + targetPath
  }
  let targetUrl = targetBase + targetPath

  // Strip fingerprinting from query string in anonymize mode
  if (privacy === 'anonymize') {
    const query = getQuery(event)
    if (Object.keys(query).length > 0) {
      const strippedQuery = stripQueryFingerprinting(query)
      // Replace query string in URL
      const basePath = targetUrl.split('?')[0] || targetUrl
      targetUrl = strippedQuery ? `${basePath}?${strippedQuery}` : basePath
    }
  }

  // Get original headers
  const originalHeaders = getHeaders(event)
  const headers: Record<string, string> = {}

  // Process headers based on privacy mode
  if (privacy === 'proxy') {
    // Proxy mode: forward all headers
    Object.assign(headers, originalHeaders)
  }
  else {
    // Anonymize mode: preserve useful analytics, prevent fingerprinting
    for (const [key, value] of Object.entries(originalHeaders)) {
      if (!value)
        continue

      const lowerKey = key.toLowerCase()

      // Skip IP-revealing headers entirely
      if (IP_HEADERS.includes(lowerKey))
        continue

      // Skip sensitive headers
      if (SENSITIVE_HEADERS.includes(lowerKey))
        continue

      // Skip content-length - we modify the body so fetch needs to recalculate
      if (lowerKey === 'content-length')
        continue

      // Normalize fingerprinting headers
      if (lowerKey === 'user-agent') {
        headers[key] = normalizeUserAgent(value)
      }
      else if (lowerKey === 'accept-language') {
        headers[key] = normalizeLanguage(value)
      }
      else if (FINGERPRINT_HEADERS.includes(lowerKey)) {
        // Skip other fingerprinting headers (sec-ch-ua-*)
        continue
      }
      else {
        // Forward other headers (content-type, accept, referer, etc.)
        headers[key] = value
      }
    }

    // Add anonymized IP for country-level geo
    const clientIP = getRequestIP(event, { xForwardedFor: true })
    if (clientIP) {
      headers['x-forwarded-for'] = anonymizeIP(clientIP)
    }
  }

  // Read and process request body if present
  let body: string | Record<string, unknown> | undefined
  let rawBody: unknown
  const contentType = originalHeaders['content-type'] || ''
  const method = event.method?.toUpperCase()
  const originalQuery = getQuery(event)

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    rawBody = await readBody(event)

    if (privacy === 'anonymize' && rawBody) {
      if (typeof rawBody === 'object') {
        // JSON body - strip fingerprinting recursively
        body = stripPayloadFingerprinting(rawBody as Record<string, unknown>)
      }
      else if (typeof rawBody === 'string') {
        // Try parsing as JSON first (sendBeacon often sends JSON with text/plain content-type)
        if (rawBody.startsWith('{') || rawBody.startsWith('[')) {
          let parsed: unknown = null
          try {
            parsed = JSON.parse(rawBody)
          }
          catch { /* not valid JSON */ }

          if (parsed && typeof parsed === 'object') {
            body = stripPayloadFingerprinting(parsed as Record<string, unknown>)
          }
          else {
            body = rawBody
          }
        }
        else if (contentType.includes('application/x-www-form-urlencoded')) {
          // URL-encoded form data
          const params = new URLSearchParams(rawBody)
          const obj: Record<string, unknown> = {}
          params.forEach((value, key) => {
            obj[key] = value
          })
          const stripped = stripPayloadFingerprinting(obj)
          body = new URLSearchParams(stripped as Record<string, string>).toString()
        }
        else {
          body = rawBody
        }
      }
      else {
        body = rawBody as string
      }
    }
    else {
      body = rawBody as string | Record<string, unknown>
    }
  }

  // Emit hook for E2E testing - allows capturing before/after data
  await (nitro.hooks.callHook as (name: string, ctx: any) => Promise<void>)('nuxt-scripts:proxy', {
    timestamp: Date.now(),
    path: event.path,
    targetUrl,
    method: method || 'GET',
    privacy,
    original: {
      headers: { ...originalHeaders },
      query: originalQuery,
      body: rawBody ?? null,
    },
    stripped: {
      headers,
      query: privacy === 'anonymize' ? stripPayloadFingerprinting(originalQuery) : originalQuery,
      body: body ?? null,
    },
  })

  // Make the proxied request
  log('[proxy] Fetching:', targetUrl)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: method || 'GET',
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      credentials: 'omit', // Don't send cookies to third parties
      signal: controller.signal,
    })
  }
  catch (err: unknown) {
    clearTimeout(timeoutId)
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('[proxy] Fetch error:', message)

    // For analytics endpoints, return a graceful 204 No Content instead of a noisy 5xx error
    // this avoids cluttering the user's console with errors for non-critical tracking requests
    if (path.includes('/collect') || path.includes('/tr') || path.includes('/events')) {
      event.node.res.statusCode = 204
      return ''
    }

    // Return a graceful error response instead of crashing for other requests
    if (message.includes('aborted') || message.includes('timeout')) {
      throw createError({
        statusCode: 504,
        statusMessage: 'Upstream timeout',
        message: `Request to ${new URL(targetUrl).hostname} timed out`,
      })
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `Failed to reach upstream: ${message}`,
    })
  }

  clearTimeout(timeoutId)
  log('[proxy] Response:', response.status, response.statusText)

  // Forward response headers (except problematic ones)
  const skipHeaders = ['set-cookie', 'transfer-encoding', 'content-encoding', 'content-length']
  response.headers.forEach((value, key) => {
    if (!skipHeaders.includes(key.toLowerCase())) {
      setResponseHeader(event, key, value)
    }
  })

  // Set status code
  event.node.res.statusCode = response.status
  event.node.res.statusMessage = response.statusText

  // Return the body as text for text-based content, otherwise as buffer
  const responseContentType = response.headers.get('content-type') || ''
  const isTextContent = responseContentType.includes('text') || responseContentType.includes('javascript') || responseContentType.includes('json')

  if (isTextContent) {
    let content = await response.text()

    // Rewrite URLs in JavaScript responses to route through our proxy
    // This is necessary because some SDKs use sendBeacon() which can't be intercepted by SW
    if (responseContentType.includes('javascript') && proxyConfig?.rewrites?.length) {
      // Use storage to cache rewritten scripts
      const cacheKey = `nuxt-scripts:proxy:${hash(targetUrl + JSON.stringify(proxyConfig.rewrites))}`
      const storage = useStorage('cache')
      const cached = await storage.getItem(cacheKey)

      if (cached && typeof cached === 'string') {
        log('[proxy] Serving rewritten script from cache')
        content = cached
      }
      else {
        content = rewriteScriptUrls(content, proxyConfig.rewrites)
        await storage.setItem(cacheKey, content, { ttl: cacheTtl })
        log('[proxy] Rewrote URLs in JavaScript response and cached')
      }

      // Add cache headers for proxied JavaScript responses
      setResponseHeader(event, 'cache-control', `public, max-age=${cacheTtl}, stale-while-revalidate=${cacheTtl * 2}`)
    }

    return content
  }

  // For binary content (images, etc.)
  return Buffer.from(await response.arrayBuffer())
})
