import { defineEventHandler, getHeaders, getRequestIP, readBody, getQuery, setResponseHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useNitroApp } from 'nitropack/runtime'

interface ProxyRewrite {
  from: string
  to: string
}

interface ProxyConfig {
  routes: Record<string, string>
  privacy: 'strict' | 'anonymize' | false
  rewrites?: Array<{ from: string, to: string }>
  /** Cache duration for JavaScript responses in seconds (default: 3600 = 1 hour) */
  cacheTtl?: number
  /** Enable verbose logging (default: only in dev) */
  debug?: boolean
}

/**
 * Rewrite URLs in script content based on proxy config.
 * Inlined from proxy-configs.ts for runtime use.
 */
function rewriteScriptUrls(content: string, rewrites: ProxyRewrite[]): string {
  let result = content
  for (const { from, to } of rewrites) {
    // Rewrite various URL formats
    result = result
      // Full URLs
      .replaceAll(`"https://${from}`, `"${to}`)
      .replaceAll(`'https://${from}`, `'${to}`)
      .replaceAll(`\`https://${from}`, `\`${to}`)
      .replaceAll(`"http://${from}`, `"${to}`)
      .replaceAll(`'http://${from}`, `'${to}`)
      .replaceAll(`\`http://${from}`, `\`${to}`)
      .replaceAll(`"//${from}`, `"${to}`)
      .replaceAll(`'//${from}`, `'${to}`)
      .replaceAll(`\`//${from}`, `\`${to}`)
  }
  return result
}

/**
 * Headers that reveal user IP address - always stripped in strict mode,
 * anonymized in anonymize mode.
 */
const IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'forwarded',
  'cf-connecting-ip',
  'true-client-ip',
  'x-client-ip',
  'x-cluster-client-ip',
]

/**
 * Headers that enable fingerprinting - stripped in strict mode,
 * normalized in anonymize mode.
 */
const FINGERPRINT_HEADERS = [
  'user-agent',
  'accept-language',
  'accept-encoding',
  'sec-ch-ua',
  'sec-ch-ua-platform',
  'sec-ch-ua-mobile',
  'sec-ch-ua-full-version-list',
]

/**
 * Payload parameters that should be stripped (fingerprinting/tracking).
 */
const STRIP_PARAMS = {
  // IP addresses
  ip: ['uip', 'ip', 'client_ip_address', 'ip_address', 'user_ip', 'ipaddress', 'context.ip'],
  // User identifiers
  userId: ['uid', 'user_id', 'userid', 'external_id', 'cid', '_gid', 'fbp', 'fbc', 'sid', 'session_id', 'sessionid', 'pl_id', 'p_user_id', 'uuid', 'anonymousid', 'twclid', 'u_c1', 'u_sclid', 'u_scsid'],
  // User data (PII) - includes email, phone, etc.
  userData: ['ud', 'user_data', 'userdata', 'email', 'phone', 'traits.email', 'traits.phone'],
  // Screen/Hardware fingerprinting (sh/sw = Snapchat screen height/width)
  screen: ['sr', 'vp', 'sd', 'screen', 'viewport', 'colordepth', 'pixelratio', 'sh', 'sw'],
  // Platform fingerprinting (d_a = architecture, d_ot = OS type, d_os = OS version)
  platform: ['plat', 'platform', 'hardwareconcurrency', 'devicememory', 'cpu', 'mem', 'd_a', 'd_ot', 'd_os'],
  // Browser fingerprinting (d_bvs = Snapchat browser versions)
  browser: ['plugins', 'fonts', 'd_bvs'],
  // Location/Timezone
  location: ['tz', 'timezone', 'timezoneoffset'],
  // Canvas/WebGL fingerprinting
  canvas: ['canvas', 'webgl', 'audiofingerprint'],
  // Combined device fingerprinting (X/Twitter dv param contains: timezone, locale, vendor, platform, screen, etc.)
  deviceInfo: ['dv', 'device_info', 'deviceinfo', 'bci', 'eci'],
}

/**
 * Parameters that should be normalized (not stripped).
 */
const NORMALIZE_PARAMS = {
  language: ['ul', 'lang', 'language', 'languages'],
  userAgent: ['ua', 'useragent', 'user_agent', 'client_user_agent', 'context.useragent'],
}

/**
 * Anonymize an IP address to country-level precision.
 * IPv4: Zero last octet (e.g., 1.2.3.4 → 1.2.3.0)
 * IPv6: Keep first 48 bits (e.g., 2001:db8:85a3::1 → 2001:db8:85a3::)
 */
function anonymizeIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: keep first 3 segments (48 bits) for country-level geo
    const parts = ip.split(':')
    return parts.slice(0, 3).join(':') + '::'
  }
  // IPv4: zero last octet for country-level geo
  const parts = ip.split('.')
  if (parts.length === 4) {
    parts[3] = '0'
    return parts.join('.')
  }
  return ip
}

/**
 * Normalize User-Agent to browser family only.
 * Preserves: Chrome, Firefox, Safari, Edge, Opera
 * Removes: version details, OS info, device info
 */
function normalizeUserAgent(ua: string): string {
  // Detect browser family
  if (ua.includes('Firefox/'))
    return 'Mozilla/5.0 (compatible; Firefox)'
  if (ua.includes('Edg/'))
    return 'Mozilla/5.0 (compatible; Edge)'
  if (ua.includes('OPR/') || ua.includes('Opera/'))
    return 'Mozilla/5.0 (compatible; Opera)'
  if (ua.includes('Safari/') && !ua.includes('Chrome/'))
    return 'Mozilla/5.0 (compatible; Safari)'
  if (ua.includes('Chrome/'))
    return 'Mozilla/5.0 (compatible; Chrome)'
  // Generic fallback
  return 'Mozilla/5.0 (compatible)'
}

/**
 * Normalize Accept-Language to primary language only.
 * e.g., "en-US,en;q=0.9,fr;q=0.8" → "en"
 */
function normalizeLanguage(lang: string): string {
  const primary = lang.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()
  return primary || 'en'
}

/**
 * Generalize screen resolution to common bucket.
 */
function generalizeScreen(value: unknown): string {
  if (typeof value === 'string') {
    const match = value.match(/(\d+)x(\d+)/)
    if (match && match[1]) {
      const width = Number.parseInt(match[1])
      if (width >= 2560) return '2560x1440'
      if (width >= 1920) return '1920x1080'
      if (width >= 1440) return '1440x900'
      if (width >= 1366) return '1366x768'
      return '1280x720'
    }
  }
  return '1920x1080'
}

/**
 * Recursively strip fingerprinting data from payload.
 */
function stripPayloadFingerprinting(
  payload: Record<string, unknown>,
  mode: 'strict' | 'anonymize',
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase()

    // Check if should be normalized FIRST (takes priority)
    const isLanguageParam = NORMALIZE_PARAMS.language.some(p => lowerKey === p.toLowerCase())
    const isUserAgentParam = NORMALIZE_PARAMS.userAgent.some(p => lowerKey === p.toLowerCase())

    if ((isLanguageParam || isUserAgentParam) && typeof value === 'string') {
      result[key] = isLanguageParam ? normalizeLanguage(value) : normalizeUserAgent(value)
      continue
    }

    // Check fingerprinting params
    // Handle bracket notation (e.g., ud[em] matches ud) and dot notation (e.g., context.ip)
    const matchesParam = (key: string, params: string[]) => {
      const lk = key.toLowerCase()
      return params.some((p) => {
        const lp = p.toLowerCase()
        // Exact match
        if (lk === lp) return true
        // Bracket notation: ud[em] matches ud
        if (lk.startsWith(lp + '[')) return true
        // Dot notation: context.ip matches context.ip exactly (handled above)
        return false
      })
    }

    const isIpParam = matchesParam(key, STRIP_PARAMS.ip)
    const isUserIdParam = matchesParam(key, STRIP_PARAMS.userId)
    const isUserDataParam = matchesParam(key, STRIP_PARAMS.userData)
    const isScreenParam = matchesParam(key, STRIP_PARAMS.screen)
    const isPlatformParam = matchesParam(key, STRIP_PARAMS.platform)
    const isCanvasParam = matchesParam(key, STRIP_PARAMS.canvas)
    const isBrowserParam = matchesParam(key, STRIP_PARAMS.browser)
    const isLocationParam = matchesParam(key, STRIP_PARAMS.location)
    const isDeviceInfoParam = matchesParam(key, STRIP_PARAMS.deviceInfo)

    const shouldStrip = isIpParam || isUserIdParam || isUserDataParam || isScreenParam
      || isPlatformParam || isCanvasParam || isBrowserParam || isLocationParam || isDeviceInfoParam

    if (mode === 'strict' && shouldStrip) {
      continue // Strip entirely
    }

    if (mode === 'anonymize') {
      if (isIpParam && typeof value === 'string') {
        result[key] = anonymizeIP(value)
        continue
      }
      if (isScreenParam) {
        result[key] = generalizeScreen(value)
        continue
      }
      // Always strip these even in anonymize mode
      if (isUserIdParam || isUserDataParam || isCanvasParam || isPlatformParam || isBrowserParam || isLocationParam || isDeviceInfoParam) {
        continue
      }
    }

    // Recursively process nested objects and arrays
    if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? stripPayloadFingerprinting(item as Record<string, unknown>, mode)
          : item,
      )
    }
    else if (typeof value === 'object' && value !== null) {
      result[key] = stripPayloadFingerprinting(value as Record<string, unknown>, mode)
    }
    else {
      result[key] = value
    }
  }

  return result
}

/**
 * Strip fingerprinting from URL query string.
 */
function stripQueryFingerprinting(
  query: Record<string, unknown>,
  mode: 'strict' | 'anonymize',
): string {
  const stripped = stripPayloadFingerprinting(query, mode)
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
  const log = debug ? console.log.bind(console) : () => {}

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
      statusMessage: `No proxy target found for path: ${path}`,
    })
  }

  // Build target URL with stripped query params
  let targetPath = path.slice(matchedPrefix.length)
  // Ensure path starts with /
  if (targetPath && !targetPath.startsWith('/')) {
    targetPath = '/' + targetPath
  }
  let targetUrl = targetBase + targetPath

  // Strip fingerprinting from query string if privacy enabled
  if (privacy) {
    const query = getQuery(event)
    if (Object.keys(query).length > 0) {
      const strippedQuery = stripQueryFingerprinting(query, privacy as 'strict' | 'anonymize')
      // Replace query string in URL
      const basePath = targetUrl.split('?')[0] || targetUrl
      targetUrl = strippedQuery ? `${basePath}?${strippedQuery}` : basePath
    }
  }

  // Get original headers
  const originalHeaders = getHeaders(event)
  const headers: Record<string, string> = {}

  // Process headers based on privacy mode
  if (privacy === false) {
    // No privacy: forward all headers
    Object.assign(headers, originalHeaders)
  }
  else if (privacy === 'strict') {
    // Strict mode: minimal headers, maximum privacy
    // Only forward essential non-identifying headers
    // Note: content-length is omitted because we modify the body (fetch calculates it)
    const allowedHeaders = ['content-type', 'accept']
    for (const [key, value] of Object.entries(originalHeaders)) {
      const lowerKey = key.toLowerCase()
      if (allowedHeaders.includes(lowerKey) && value) {
        headers[key] = value
      }
    }
    // Generic User-Agent so requests don't look suspicious
    headers['user-agent'] = 'Mozilla/5.0 (compatible)'
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

    if (privacy && rawBody) {
      const privacyMode = privacy as 'strict' | 'anonymize'
      if (typeof rawBody === 'object') {
        // JSON body - strip fingerprinting recursively
        body = stripPayloadFingerprinting(rawBody as Record<string, unknown>, privacyMode)
      }
      else if (typeof rawBody === 'string') {
        // Try parsing as JSON first (sendBeacon often sends JSON with text/plain content-type)
        if (rawBody.startsWith('{') || rawBody.startsWith('[')) {
          let parsed: unknown = null
          try { parsed = JSON.parse(rawBody) }
          catch { /* not valid JSON */ }

          if (parsed && typeof parsed === 'object') {
            body = stripPayloadFingerprinting(parsed as Record<string, unknown>, privacyMode)
          }
          else {
            body = rawBody
          }
        }
        else if (contentType.includes('application/x-www-form-urlencoded')) {
          // URL-encoded form data
          const params = new URLSearchParams(rawBody)
          const obj: Record<string, unknown> = {}
          params.forEach((value, key) => { obj[key] = value })
          const stripped = stripPayloadFingerprinting(obj, privacyMode)
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
  await (nitro.hooks.callHook as Function)('nuxt-scripts:proxy', {
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
      query: privacy ? stripPayloadFingerprinting(originalQuery, privacy as 'strict' | 'anonymize') : originalQuery,
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

    // Return a graceful error response instead of crashing
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
      content = rewriteScriptUrls(content, proxyConfig.rewrites)
      log('[proxy] Rewrote URLs in JavaScript response')

      // Add cache headers for JavaScript responses (immutable content with hash in filename)
      setResponseHeader(event, 'cache-control', `public, max-age=${cacheTtl}, stale-while-revalidate=${cacheTtl * 2}`)
    }

    return content
  }

  // For binary content (images, etc.)
  return Buffer.from(await response.arrayBuffer())
})
