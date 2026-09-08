import type { ProxyPrivacyInput, ResolvedProxyPrivacy } from './utils/privacy'
import { createError, defineEventHandler, getHeaders, getQuery, getRequestIP, getRequestWebStream, sendStream, setResponseHeader, setResponseStatus } from '#nuxt-scripts/h3'
import { useNitroApp, useRuntimeConfig } from '#nuxt-scripts/nitro'
import { matchDomain } from './utils/match-domain'
import { closePublicNetworkDispatcher, createPublicNetworkDispatcher, isPrivateNetworkResolutionError, isPublicNetworkHostname } from './utils/network-host'
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
const MAX_TRANSFORM_BODY_SIZE = 2 * 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 15000
const MAX_UPSTREAM_REDIRECTS = 5
const SKIP_RESPONSE_HEADERS = new Set([
  'alt-svc',
  'clear-site-data',
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'nel',
  'proxy-authenticate',
  'proxy-authorization',
  'report-to',
  'reporting-endpoints',
  'set-cookie',
  'set-cookie2',
  'strict-transport-security',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'www-authenticate',
])
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
 * Read the raw request body bytes, bounded by MAX_TRANSFORM_BODY_SIZE.
 * Buffering lets privacy transforms and redirect hops replay the same bytes.
 */
async function readBodyBytes(event: Parameters<typeof getRequestWebStream>[0]): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const contentLength = Number(getHeaders(event)['content-length'] || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_TRANSFORM_BODY_SIZE) {
    throw createError({ statusCode: 413, statusMessage: 'Proxy request body too large' })
  }

  const stream = getRequestWebStream(event)
  if (!stream)
    return undefined
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      if (!value)
        continue
      total += value.byteLength
      if (total > MAX_TRANSFORM_BODY_SIZE) {
        try {
          await reader.cancel('Proxy request body too large')
        }
        catch {
          // The size-limit response takes precedence over cancellation errors.
        }
        throw createError({ statusCode: 413, statusMessage: 'Proxy request body too large' })
      }
      chunks.push(value)
    }
  }
  finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export function withResponseBodyIdleTimeout(
  body: ReadableStream<Uint8Array>,
  timeoutMs: number,
  onTimeout: () => void,
): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  let stopped = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const clearIdleTimeout = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      timeoutId = setTimeout(() => {
        stopped = true
        const error = createError({
          statusCode: 504,
          statusMessage: 'Gateway Timeout',
          message: 'Upstream response body timed out',
        })
        onTimeout()
        controller.error(error)
        void reader.cancel(error).catch((cancelError) => {
          Object.assign(error, { cause: cancelError })
        })
      }, timeoutMs)

      const result = await reader.read().catch((error) => {
        clearIdleTimeout()
        if (!stopped)
          controller.error(error)
        return undefined
      })
      clearIdleTimeout()
      if (!result || stopped)
        return
      if (result.done) {
        stopped = true
        controller.close()
        return
      }
      controller.enqueue(result.value)
    },
    async cancel(reason) {
      stopped = true
      clearIdleTimeout()
      await reader.cancel(reason)
    },
  })
}

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
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (item !== undefined && item !== null)
        params.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))
    }
  }
  return { queryString: params.toString(), stripped }
}

/**
 * Privacy-aware proxy handler for first-party script collection endpoints.
 * Routes requests to third-party analytics while protecting user privacy.
 */

function isUpstreamRedirect(status: number): boolean {
  return status >= 300 && status < 400 && status !== 304
}

/** Map a transport failure to the gateway error the client should see. */
function upstreamFetchError(err: unknown, timedOut: boolean) {
  const blockedPrivateNetwork = isPrivateNetworkResolutionError(err)
  return createError({
    statusCode: blockedPrivateNetwork ? 403 : timedOut ? 504 : 502,
    statusMessage: blockedPrivateNetwork ? 'Local network targets are not allowed' : timedOut ? 'Gateway Timeout' : 'Bad Gateway',
    message: 'Proxy upstream request failed',
    cause: err,
    data: {
      errorName: (err as Error)?.name,
      errorCode: timedOut ? 'TIMEOUT' : (err as { code?: string })?.code,
    },
  })
}

interface ProxyRedirectState {
  url: URL
  method: string
  body: BodyInit | undefined
  headers: Record<string, string>
}

/**
 * Resolve an upstream redirect into the next request state, mirroring the
 * fetch spec: 300/301/302 replay a POST as a GET without a body, 303 replays
 * every non-idempotent method as a GET, 307/308 preserve method and body.
 * The hop is only returned after it passes the initial target's checks.
 */
function resolveProxyRedirect(
  response: Pick<Response, 'status' | 'headers'>,
  state: ProxyRedirectState,
  redirectCount: number,
  urlAllowed: (url: URL) => boolean,
): ProxyRedirectState {
  const location = response.headers.get('location')
  if (!location) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Invalid upstream redirect',
      message: 'Upstream redirect has no Location header',
    })
  }
  if (redirectCount >= MAX_UPSTREAM_REDIRECTS) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Too many upstream redirects',
      message: 'Upstream redirect limit exceeded',
    })
  }

  let nextUrl: URL
  try {
    nextUrl = new URL(location, state.url)
  }
  catch (cause) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Invalid upstream redirect',
      message: 'Upstream redirect URL is invalid',
      cause,
    })
  }
  if (!urlAllowed(nextUrl)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Unsafe upstream redirect',
      message: `Upstream redirect target is not allowed: ${nextUrl.origin}`,
    })
  }

  const switchToGet = (response.status === 303 && state.method !== 'GET' && state.method !== 'HEAD')
    || ((response.status === 300 || response.status === 301 || response.status === 302) && state.method === 'POST')
  if (!switchToGet)
    return { ...state, url: nextUrl }

  const headers = { ...state.headers }
  for (const header of ['content-type', 'content-encoding', 'content-length'])
    delete headers[header]
  return { url: nextUrl, method: 'GET', body: undefined, headers }
}

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

  if (!isPublicNetworkHostname(domain)) {
    log('[proxy] Rejected local or non-public target:', domain)
    throw createError({
      statusCode: 403,
      statusMessage: 'Local network targets are not allowed',
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

  // Process request body: buffer the raw bytes once so privacy transforms can
  // decode them and redirect hops can replay the exact body upstream.
  let body: string | Record<string, unknown> | unknown[] | number | boolean | null | undefined
  let rawBody: unknown
  let rawBodyBytes: Uint8Array<ArrayBuffer> | undefined
  // When true, no safe transforms are available — the buffered bytes are forwarded as-is
  let passthroughBody = false

  if (isWriteMethod) {
    rawBodyBytes = await readBodyBytes(event)
    if (!shouldTransformBody) {
      // No safe transforms available or needed. Forward the original bytes.
      passthroughBody = true
    }
    else if (transformableBodyType === 'form') {
      const formBody = rawBodyBytes === undefined ? undefined : new TextDecoder().decode(rawBodyBytes)
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
      const jsonBody = rawBodyBytes === undefined ? undefined : new TextDecoder().decode(rawBodyBytes)
      if (jsonBody !== undefined) {
        try {
          rawBody = JSON.parse(jsonBody)
        }
        catch (error) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid JSON proxy request body',
            cause: error,
          })
        }
      }

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
  await (nitro.hooks?.callHook as ((name: string, ctx: any) => Promise<void>) | undefined)?.('nuxt-scripts:proxy', {
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
  }, UPSTREAM_TIMEOUT_MS)

  // Resolve the fetch body from the buffered request bytes so redirect hops
  // can replay it.
  let fetchBody: BodyInit | undefined
  if (passthroughBody) {
    if (rawBodyBytes && rawBodyBytes.byteLength > 0)
      fetchBody = rawBodyBytes
  }
  else if (body !== undefined) {
    fetchBody = transformableBodyType === 'json' ? JSON.stringify(body) : String(body)
  }

  // A redirect hop must pass the same checks as the initial target: HTTPS on
  // the default port, no embedded credentials, a public hostname, and the
  // domain allowlist.
  const hopAllowed = (url: URL): boolean =>
    url.protocol === 'https:'
    && !url.username
    && !url.password
    && (!url.port || url.port === '443')
    && isPublicNetworkHostname(url.hostname)
    && Object.keys(domainPrivacy).some(configDomain => matchDomain(url.hostname, configDomain))

  let response: Response
  let network: Awaited<ReturnType<typeof createPublicNetworkDispatcher>> | undefined
  try {
    network = await createPublicNetworkDispatcher()
    let state: ProxyRedirectState = {
      url: new URL(targetUrl),
      method: method || 'GET',
      body: fetchBody,
      headers,
    }
    for (let redirectCount = 0; ; redirectCount++) {
      let hop: Response
      try {
        hop = await network.fetch(state.url.toString(), {
          method: state.method,
          headers: state.headers,
          body: state.body,
          credentials: 'omit', // Don't send cookies to third parties
          signal: controller.signal,
          redirect: 'manual',
        })
      }
      catch (err) {
        log('[proxy] Upstream error:', err)
        throw upstreamFetchError(err, timedOut)
      }
      log('[proxy] Response:', hop.status, hop.statusText)

      if (!isUpstreamRedirect(hop.status)) {
        response = hop
        break
      }

      // Follow the redirect only after the hop passes the initial target's checks.
      let next: ProxyRedirectState
      try {
        next = resolveProxyRedirect(hop, state, redirectCount, hopAllowed)
      }
      catch (err) {
        await hop.body?.cancel(err as Error).catch(cancelError => Object.assign(err as Error, { cleanupError: cancelError }))
        throw err
      }
      const redirectDiscarded = new Error('Upstream redirect response body discarded')
      await hop.body?.cancel(redirectDiscarded).catch(cancelError => Object.assign(redirectDiscarded, { cause: cancelError }))
      log('[proxy] Following redirect:', next.url.toString())
      state = next
    }
    clearTimeout(timeoutId)
  }
  catch (err) {
    clearTimeout(timeoutId)
    await closePublicNetworkDispatcher(network, err)
    throw err
  }
  log('[proxy] Upstream settled:', response.status)

  // Headers named by Connection are hop-by-hop too, including non-standard names.
  const responseConnectionHeaders = new Set(
    (response.headers.get('connection') || '')
      .split(',')
      .map(header => header.trim().toLowerCase())
      .filter(Boolean),
  )

  // Forward response headers except hop-by-hop, framing, compression, and cookies.
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (!SKIP_RESPONSE_HEADERS.has(lowerKey) && !responseConnectionHeaders.has(lowerKey)) {
      setResponseHeader(event, key, value)
    }
  })

  // This route can expose broad vendor hosts under the application's origin.
  // Sandbox direct document navigations while preserving subresource responses.
  setResponseHeader(event, 'Content-Security-Policy', 'sandbox; default-src \'none\'; base-uri \'none\'; form-action \'none\'')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  setResponseStatus(event, response.status, response.statusText)

  if (!response.body) {
    await closePublicNetworkDispatcher(network)
    return null
  }

  // Stream rather than buffering potentially large upstream responses. This lowers
  // memory pressure and lets the browser receive headers and chunks immediately.
  const guardedBody = withResponseBodyIdleTimeout(response.body, UPSTREAM_TIMEOUT_MS, () => controller.abort())
  let streamError: unknown
  try {
    return await sendStream(event, guardedBody)
  }
  catch (error) {
    streamError = error
    throw error
  }
  finally {
    await closePublicNetworkDispatcher(network, streamError)
  }
})
