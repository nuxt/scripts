import { defineEventHandler, getHeaders, getRequestIP, readBody, getQuery, setResponseHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useStorage, useNitroApp } from 'nitropack/runtime'
import { hash } from 'ohash'
import { rewriteScriptUrls } from '../utils/pure'
import {
  SENSITIVE_HEADERS,
  anonymizeIP,
  normalizeLanguage,
  normalizeUserAgent,
  stripPayloadFingerprinting,
  resolvePrivacy,
  mergePrivacy,
} from './utils/privacy'
import type { ProxyPrivacyInput } from './utils/privacy'

interface ProxyConfig {
  routes: Record<string, string>
  /** Global user override — undefined means use per-script defaults */
  privacy?: ProxyPrivacyInput
  /** Per-script privacy from registry (every route has an entry) */
  routePrivacy: Record<string, ProxyPrivacyInput>
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
  privacy?: import('./utils/privacy').ResolvedProxyPrivacy,
): string {
  const stripped = stripPayloadFingerprinting(query, privacy)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(stripped)) {
    if (value !== undefined && value !== null) {
      params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
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
  const proxyConfig = config['nuxt-scripts-proxy'] as unknown as ProxyConfig | undefined

  if (!proxyConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: 'First-party proxy not configured',
    })
  }

  const { routes, privacy: globalPrivacy, routePrivacy, cacheTtl = 3600, debug = import.meta.dev } = proxyConfig
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
  let matchedRoutePattern: string | undefined

  const sortedRoutes = Object.entries(routes).sort((a, b) => b[0].length - a[0].length)
  for (const [routePattern, target] of sortedRoutes) {
    // Convert route pattern to prefix (remove /** suffix)
    const prefix = routePattern.replace(/\/\*\*$/, '')
    if (path.startsWith(prefix)) {
      targetBase = target.replace(/\/\*\*$/, '')
      matchedPrefix = prefix
      matchedRoutePattern = routePattern
      log('[proxy] Matched:', prefix, '->', targetBase)
      break
    }
  }

  if (!targetBase || !matchedPrefix || !matchedRoutePattern) {
    log('[proxy] No match for path:', path)
    throw createError({
      statusCode: 404,
      statusMessage: 'No proxy route matched',
      message: `No proxy target found for path: ${path}`,
    })
  }

  // Resolve effective privacy: per-script is the base, global user override on top
  // Fail-closed: missing per-script entry → full anonymization (most restrictive)
  const perScriptInput = routePrivacy[matchedRoutePattern]
  if (debug && perScriptInput === undefined) {
    log('[proxy] WARNING: No privacy config for route', matchedRoutePattern, '— defaulting to full anonymization')
  }
  const perScriptResolved = resolvePrivacy(perScriptInput ?? true)
  // Global override: when set by user, it overrides per-script field-by-field
  const privacy = globalPrivacy !== undefined ? mergePrivacy(perScriptResolved, globalPrivacy) : perScriptResolved
  const anyPrivacy = privacy.ip || privacy.userAgent || privacy.language || privacy.screen || privacy.timezone || privacy.hardware

  // Build target URL with stripped query params
  let targetPath = path.slice(matchedPrefix.length)
  // Ensure path starts with /
  if (targetPath && !targetPath.startsWith('/')) {
    targetPath = '/' + targetPath
  }
  let targetUrl = targetBase + targetPath

  // Strip fingerprinting from query string when any privacy flag is active
  if (anyPrivacy) {
    const query = getQuery(event)
    if (Object.keys(query).length > 0) {
      const strippedQuery = stripQueryFingerprinting(query, privacy)
      // Replace query string in URL
      const basePath = targetUrl.split('?')[0] || targetUrl
      targetUrl = strippedQuery ? `${basePath}?${strippedQuery}` : basePath
    }
  }

  // Get original headers
  const originalHeaders = getHeaders(event)
  const headers: Record<string, string> = {}

  // Process headers based on per-flag privacy
  for (const [key, value] of Object.entries(originalHeaders)) {
    if (!value) continue
    const lowerKey = key.toLowerCase()

    // SENSITIVE_HEADERS always stripped regardless of privacy flags
    if (SENSITIVE_HEADERS.includes(lowerKey)) continue

    // Skip content-length when any privacy is active — body may be modified
    if (anyPrivacy && lowerKey === 'content-length') continue

    // IP-revealing headers — controlled by ip flag
    if (lowerKey === 'x-forwarded-for' || lowerKey === 'x-real-ip' || lowerKey === 'forwarded'
      || lowerKey === 'cf-connecting-ip' || lowerKey === 'true-client-ip'
      || lowerKey === 'x-client-ip' || lowerKey === 'x-cluster-client-ip') {
      if (privacy.ip) continue // skip — we add anonymized version below
      // Use lowercase key to avoid duplicate headers with mixed casing
      headers[lowerKey] = value
      continue
    }

    // User-Agent — controlled by userAgent flag
    if (lowerKey === 'user-agent') {
      headers[key] = privacy.userAgent ? normalizeUserAgent(value) : value
      continue
    }

    // Accept-Language — controlled by language flag
    if (lowerKey === 'accept-language') {
      headers[key] = privacy.language ? normalizeLanguage(value) : value
      continue
    }

    // Client Hints (hardware flag)
    if (lowerKey === 'sec-ch-ua' || lowerKey === 'sec-ch-ua-full-version-list') {
      headers[lowerKey] = privacy.hardware
        ? value.replace(/;v="(\d+)\.[^"]*"/g, ';v="$1"')
        : value
      continue
    }

    // High-entropy client hints — strip when hardware flag active
    if (lowerKey === 'sec-ch-ua-platform-version' || lowerKey === 'sec-ch-ua-arch'
      || lowerKey === 'sec-ch-ua-model' || lowerKey === 'sec-ch-ua-bitness') {
      if (privacy.hardware) continue // strip high-entropy hints
      headers[lowerKey] = value
      continue
    }

    // Other client hints (sec-ch-ua-platform, sec-ch-ua-mobile are low entropy) — pass through
    headers[key] = value
  }

  // IP handling: only set x-forwarded-for if not already copied from the header loop
  if (!headers['x-forwarded-for']) {
    const clientIP = getRequestIP(event, { xForwardedFor: true })
    if (clientIP) {
      if (privacy.ip) {
        headers['x-forwarded-for'] = anonymizeIP(clientIP)
      }
      else {
        headers['x-forwarded-for'] = clientIP
      }
    }
  }
  else if (privacy.ip) {
    // Anonymize each IP in the existing chain
    headers['x-forwarded-for'] = headers['x-forwarded-for']
      .split(',')
      .map(ip => anonymizeIP(ip.trim()))
      .join(', ')
  }

  // Read and process request body if present
  let body: string | Record<string, unknown> | undefined
  let rawBody: unknown
  const contentType = originalHeaders['content-type'] || ''
  const method = event.method?.toUpperCase()
  const originalQuery = getQuery(event)

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    rawBody = await readBody(event)

    if (anyPrivacy && rawBody) {
      if (typeof rawBody === 'object') {
        // JSON body - strip fingerprinting recursively
        body = stripPayloadFingerprinting(rawBody as Record<string, unknown>, privacy)
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
            body = stripPayloadFingerprinting(parsed as Record<string, unknown>, privacy)
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
          const stripped = stripPayloadFingerprinting(obj, privacy)
          // Convert all values to strings — URLSearchParams coerces non-strings
          // to "[object Object]" which corrupts nested objects/arrays
          const stringified: Record<string, string> = {}
          for (const [k, v] of Object.entries(stripped)) {
            if (v === undefined || v === null) continue
            stringified[k] = typeof v === 'string' ? v : JSON.stringify(v)
          }
          body = new URLSearchParams(stringified).toString()
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
      query: anyPrivacy ? stripPayloadFingerprinting(originalQuery, privacy) : originalQuery,
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
    log('[proxy] Fetch error:', err instanceof Error ? err.message : err)

    // For analytics endpoints, return a graceful 204 No Content instead of a noisy 5xx error
    // this avoids cluttering the user's console with errors for non-critical tracking requests
    if (path.includes('/collect') || path.includes('/tr') || path.includes('/events')) {
      event.node.res.statusCode = 204
      return ''
    }

    const isTimeout = err instanceof Error && (err.message.includes('aborted') || err.message.includes('timeout'))
    throw createError({
      statusCode: isTimeout ? 504 : 502,
      statusMessage: isTimeout ? 'Upstream timeout' : 'Bad Gateway',
      message: 'Failed to reach upstream',
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
