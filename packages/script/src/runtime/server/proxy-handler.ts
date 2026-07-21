import type { ProxyPrivacyInput, ResolvedProxyPrivacy } from './utils/privacy'
import { createError, defineEventHandler, getHeaders, getQuery, getRequestIP, getRequestWebStream, readBody, readRawBody, setResponseHeader, setResponseStatus } from 'h3'
import { useNitroApp, useRuntimeConfig } from 'nitropack/runtime'
import { matchDomain } from './utils/match-domain'
import {
  anonymizeIP,
  mergePrivacy,
  normalizeLanguage,
  normalizeUserAgent,
  resolvePrivacy,
  SENSITIVE_HEADERS,
  stripPayloadFingerprinting,
} from './utils/privacy'

interface ProxyConfig {
  /** Proxy path prefix (e.g. /_scripts/p) */
  proxyPrefix: string
  /** Allowed domains with their privacy config */
  domainPrivacy: Record<string, ProxyPrivacyInput>
  /** Reverse map of path alias → real third-party domain (when alias paths are enabled) */
  aliasToDomain?: Record<string, string>
  /** Global user override — undefined means use per-script defaults */
  privacy?: ProxyPrivacyInput
  /** Enable verbose logging (default: only in dev) */
  debug?: boolean
}

const COMPRESSION_RE = /gzip|deflate|br|compress|base64/i
const CLIENT_HINT_VERSION_RE = /;v="(\d+)\.[^"]*"/g
const SKIP_RESPONSE_HEADERS = new Set(['set-cookie', 'transfer-encoding', 'content-encoding', 'content-length'])
// Hop-by-hop request headers per RFC 7230 §6.1 — must not be forwarded by a proxy
export const SKIP_REQUEST_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

/**
 * Strip fingerprinting from URL query string.
 * Returns both the query string and the stripped record (to avoid re-computing for hooks).
 */
function stripQueryFingerprinting(
  query: Record<string, unknown>,
  privacy: ResolvedProxyPrivacy,
): { queryString: string, stripped: Record<string, unknown> } {
  const stripped = stripPayloadFingerprinting(query, privacy)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(stripped)) {
    if (value !== undefined && value !== null) {
      params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
    }
  }
  return { queryString: params.toString(), stripped }
}

/**
 * Privacy-aware proxy handler for first-party script collection endpoints.
 * Routes requests to third-party analytics while protecting user privacy.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyConfig = config['nuxt-scripts-proxy'] as unknown as ProxyConfig | undefined

  if (!proxyConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: 'First-party proxy not configured',
    })
  }

  const { proxyPrefix, domainPrivacy, aliasToDomain, privacy: globalPrivacy, debug = import.meta.dev } = proxyConfig
  const path = event.path
  const log = debug
    ? (message: string, ...args: any[]) => {
        // eslint-disable-next-line no-console
        console.debug(message, ...args)
      }
    : () => {}

  // Extract domain and remaining path from: /_scripts/p/<host-or-alias>/<path>
  const afterPrefix = path.slice(proxyPrefix.length + 1) // +1 for the slash after prefix
  const slashIdx = afterPrefix.indexOf('/')
  const segment = slashIdx > 0 ? afterPrefix.slice(0, slashIdx) : afterPrefix
  const remainingPath = slashIdx > 0 ? afterPrefix.slice(slashIdx) : '/'

  // Resolve path alias back to the real third-party domain. Falls back to the
  // segment itself so verbatim-hostname paths keep working when aliasing is off.
  // `Object.hasOwn` guard: a crafted segment like `toString`/`constructor` must not
  // resolve to an inherited prototype member (which would break allowlist matching).
  const domain = aliasToDomain && Object.hasOwn(aliasToDomain, segment) ? aliasToDomain[segment] : segment

  if (!domain) {
    log('[proxy] No domain in path:', path)
    throw createError({
      statusCode: 404,
      statusMessage: 'No proxy domain found',
      message: `No domain in proxy path: ${path}`,
    })
  }

  // Find privacy config by matching domain (exact, parent domain, or wildcard pattern)
  let perScriptInput: ProxyPrivacyInput | undefined
  for (const [configDomain, privacyInput] of Object.entries(domainPrivacy)) {
    if (matchDomain(domain, configDomain)) {
      perScriptInput = privacyInput
      break
    }
  }

  if (perScriptInput === undefined) {
    log('[proxy] Rejected: domain not in allowlist:', domain)
    throw createError({
      statusCode: 403,
      statusMessage: 'Domain not allowed',
      message: `Proxy domain not in allowlist: ${domain}`,
    })
  }

  const targetBase = `https://${domain}`
  log('[proxy] Matched:', domain, '->', targetBase)

  // Resolve effective privacy: per-script is the base, global user override on top
  // Fail-closed: missing domain → full anonymization (most restrictive)
  const perScriptResolved = resolvePrivacy(perScriptInput ?? true)
  // Global override: when set by user, it overrides per-script field-by-field
  const privacy = globalPrivacy !== undefined ? mergePrivacy(perScriptResolved, globalPrivacy) : perScriptResolved
  const anyPrivacy = privacy.ip || privacy.userAgent || privacy.language || privacy.screen || privacy.timezone || privacy.hardware

  const originalHeaders = getHeaders(event)
  const originalQuery = getQuery(event)
  const contentType = originalHeaders['content-type']?.toLowerCase() || ''
  const compressionParam = (originalQuery.compression as string) || ''
  const method = event.method?.toUpperCase()
  const isWriteMethod = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const transformableBodyType = contentType.includes('application/x-www-form-urlencoded')
    ? 'form'
    : contentType.includes('json')
      ? 'json'
      : undefined

  // Only parse formats whose structure is known. Opaque bodies may contain binary
  // data despite a text content type, as with PostHog's gzip payloads.
  const hasOpaqueBodyEncoding = Boolean(
    originalHeaders['content-encoding']
    || contentType.includes('octet-stream')
    || (compressionParam && COMPRESSION_RE.test(compressionParam)),
  )
  const shouldTransformBody = isWriteMethod
    && anyPrivacy
    && !hasOpaqueBodyEncoding
    && transformableBodyType !== undefined

  // Build target URL with stripped query params
  let targetUrl = targetBase + remainingPath

  // Strip fingerprinting from query string when any privacy flag is active
  let strippedQueryRecord: Record<string, unknown> | undefined
  if (anyPrivacy) {
    if (Object.keys(originalQuery).length > 0) {
      const { queryString, stripped } = stripQueryFingerprinting(originalQuery, privacy)
      strippedQueryRecord = stripped
      // Replace query string in URL
      const basePath = targetUrl.split('?')[0] || targetUrl
      targetUrl = queryString ? `${basePath}?${queryString}` : basePath
    }
  }

  const headers: Record<string, string> = {}

  // Collect additional hop-by-hop headers named in the Connection header value (RFC 7230 §6.1).
  // e.g. `Connection: keep-alive, X-Custom` → also strip `X-Custom`.
  const connectionHeaderValue = originalHeaders.connection
  const connectionNamedHeaders = connectionHeaderValue
    ? new Set(connectionHeaderValue.split(',').map(h => h.trim().toLowerCase()).filter(Boolean))
    : null

  // Process headers based on per-flag privacy
  for (const [key, value] of Object.entries(originalHeaders)) {
    if (!value)
      continue
    const lowerKey = key.toLowerCase()

    // host header — fetch derives it from URL, don't forward the first-party host
    if (lowerKey === 'host')
      continue

    // Hop-by-hop headers (RFC 7230 §6.1) — never forward
    if (SKIP_REQUEST_HEADERS.has(lowerKey))
      continue

    // Headers listed in the Connection header are also hop-by-hop
    if (connectionNamedHeaders?.has(lowerKey))
      continue

    // SENSITIVE_HEADERS always stripped regardless of privacy flags
    if (SENSITIVE_HEADERS.includes(lowerKey))
      continue

    // Skip content-length when body will be modified by privacy transforms.
    if (lowerKey === 'content-length') {
      if (shouldTransformBody)
        continue
      headers[lowerKey] = value
      continue
    }

    // IP-revealing headers — controlled by ip flag
    if (lowerKey === 'x-forwarded-for' || lowerKey === 'x-real-ip' || lowerKey === 'forwarded'
      || lowerKey === 'cf-connecting-ip' || lowerKey === 'true-client-ip'
      || lowerKey === 'x-client-ip' || lowerKey === 'x-cluster-client-ip') {
      if (privacy.ip)
        continue // skip — we add anonymized version below
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
        ? value.replace(CLIENT_HINT_VERSION_RE, ';v="$1"')
        : value
      continue
    }

    // High-entropy client hints — strip when hardware flag active
    if (lowerKey === 'sec-ch-ua-platform-version' || lowerKey === 'sec-ch-ua-arch'
      || lowerKey === 'sec-ch-ua-model' || lowerKey === 'sec-ch-ua-bitness') {
      if (privacy.hardware)
        continue // strip high-entropy hints
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

  // Process request body: either stream through raw or read + transform
  let body: string | Record<string, unknown> | unknown[] | number | boolean | null | undefined
  let rawBody: unknown
  // When true, body is not read — the raw request stream is piped directly to upstream
  let passthroughBody = false

  if (isWriteMethod) {
    if (!shouldTransformBody) {
      // No safe transforms available or needed. Stream the original bytes directly.
      passthroughBody = true
    }
    else if (transformableBodyType === 'form') {
      const formBody = await readRawBody(event)
      rawBody = formBody

      if (formBody != null) {
        // Preserve repeated keys while applying privacy transforms to form fields.
        const params = new URLSearchParams(formBody)
        const formRecord: Record<string, unknown> = Object.create(null)
        for (const [key, value] of params.entries()) {
          if (Object.hasOwn(formRecord, key)) {
            const existing = formRecord[key]
            formRecord[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
          }
          else {
            formRecord[key] = value
          }
        }

        const stripped = stripPayloadFingerprinting(formRecord, privacy)
        const transformedValues = new Map<string, unknown[]>()
        for (const [key, value] of Object.entries(stripped)) {
          transformedValues.set(key, Array.isArray(value) ? [...value] : [value])
        }

        const transformed = new URLSearchParams()
        for (const [key] of params.entries()) {
          const value = transformedValues.get(key)?.shift()
          if (value === undefined || value === null)
            continue
          transformed.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
        body = transformed.toString()
      }
    }
    else {
      // JSON body with privacy transforms.
      rawBody = await readBody(event)

      if (Array.isArray(rawBody)) {
        // JSON array body (e.g. batch payloads) — strip each element individually
        body = rawBody.map(item =>
          item && typeof item === 'object' && !Array.isArray(item)
            ? stripPayloadFingerprinting(item as Record<string, unknown>, privacy)
            : item,
        )
      }
      else if (rawBody !== null && typeof rawBody === 'object') {
        // JSON object body, strip fingerprinting recursively.
        body = stripPayloadFingerprinting(rawBody as Record<string, unknown>, privacy)
      }
      else {
        // JSON primitives do not contain fingerprinting fields, but must retain JSON encoding.
        body = rawBody as string | number | boolean | null | undefined
      }
    }
  }

  // Emit hook for E2E testing — allows capturing before/after data
  const nitro = useNitroApp()
  await (nitro.hooks.callHook as (name: string, ctx: any) => Promise<void>)('nuxt-scripts:proxy', {
    timestamp: Date.now(),
    path: event.path,
    targetUrl,
    method: method || 'GET',
    privacy,
    passthroughBody,
    original: {
      headers: { ...originalHeaders },
      query: originalQuery,
      body: passthroughBody ? '<passthrough>' : (rawBody ?? null),
    },
    stripped: {
      headers,
      query: strippedQueryRecord ?? originalQuery,
      body: passthroughBody ? '<passthrough>' : (body ?? null),
    },
  })

  // Make the proxied request
  log('[proxy] Fetching:', targetUrl)

  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 15000) // 15s timeout

  // Resolve the fetch body: passthrough streams the raw request, otherwise serialize
  let fetchBody: BodyInit | undefined
  if (passthroughBody) {
    fetchBody = getRequestWebStream(event) as BodyInit | undefined
  }
  else if (body !== undefined) {
    fetchBody = transformableBodyType === 'json' ? JSON.stringify(body) : String(body)
  }

  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: method || 'GET',
      headers,
      body: fetchBody,
      credentials: 'omit', // Don't send cookies to third parties
      signal: controller.signal,
      // @ts-expect-error Node fetch supports duplex for streaming request bodies
      duplex: passthroughBody ? 'half' : undefined,
    })
  }
  catch (err) {
    log('[proxy] Upstream error:', err)
    throw createError({
      statusCode: timedOut ? 504 : 502,
      statusMessage: timedOut ? 'Gateway Timeout' : 'Bad Gateway',
      message: `Proxy upstream request failed: ${targetUrl}`,
      cause: err,
      data: {
        errorName: (err as Error)?.name,
        errorCode: timedOut ? 'TIMEOUT' : (err as { code?: string })?.code,
      },
    })
  }
  finally {
    clearTimeout(timeoutId)
  }

  log('[proxy] Response:', response.status, response.statusText)

  // Forward response headers (except problematic ones)
  response.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      setResponseHeader(event, key, value)
    }
  })

  setResponseStatus(event, response.status, response.statusText)

  // Return the body as text for text-based content, otherwise as buffer
  const responseContentType = response.headers.get('content-type') || ''
  const isTextContent = responseContentType.includes('text') || responseContentType.includes('javascript') || responseContentType.includes('json')

  if (isTextContent) {
    return await response.text()
  }

  // For binary content (images, etc.)
  return Buffer.from(await response.arrayBuffer())
})
