import type { FetchResponse } from 'ofetch'
import { Buffer } from 'node:buffer'
import { defineCachedFunction } from 'nitropack/runtime'
import { createFetch } from 'ofetch'
import { hash } from 'ohash'
import { createPublicNetworkDispatcher, isPublicNetworkHostname } from './network-host'

/**
 * Server-side caches for upstream proxy fetches.
 *
 * ## Why
 *
 * Proxy URLs arriving from the client carry per-request auth artefacts (`sig`,
 * `_pt`, `_ts`) that change across renders. CDNs key on full URL so each
 * rotation produces a unique edge cache entry and upstream origins take the hit
 * on every render. Caching the *upstream response* here — keyed on the inner
 * resource URL (or normalized param set) — dedupes those fetches across every
 * request that resolves to the same upstream, regardless of how the caller
 * authenticated.
 *
 * Safe because `withSigning` runs before any cache path: unsigned requests 403
 * before they can do a cache lookup. Cache stores hold only responses produced
 * from legitimately-authenticated requests.
 *
 * ## Binary payloads
 *
 * Image/blob responses are stored as base64 strings so they round-trip cleanly
 * through every unstorage driver (memory, filesystem, redis, cloudflare kv).
 * The 33% size overhead is tolerable; the alternative is relying on each driver
 * to preserve Buffer/ArrayBuffer which is not universal.
 */

export interface CachedBinaryResponse {
  base64: string
  contentType: string | null
}

export interface CachedBinaryFetchOptions {
  headers?: Record<string, string>
  timeout?: number
  redirect?: 'follow' | 'manual'
  ignoreResponseError?: boolean
}

export interface CachedBinaryFetchConfig {
  /** Validate the initial URL and every redirect before requesting it. */
  allowUrl?: (url: URL) => boolean
  maxRedirects?: number
  /** Maximum decoded response size stored in cache. Defaults to 10 MiB. */
  maxResponseBytes?: number
}

export interface CachedJsonFetchConfig<T> {
  /** Validate the initial URL and every redirect before requesting it. */
  allowUrl: (url: URL) => boolean
  maxRedirects?: number
  responseType?: 'json' | 'text'
  contentTypePrefixes?: string[]
  /** Maximum decoded response size stored in cache. Defaults to 2 MiB. */
  maxResponseBytes?: number
  /** Runs before caching. Throw to reject an invalid upstream response. */
  validateResponse?: (data: T) => void
}

export interface CachedBinaryResult extends CachedBinaryResponse {
  body: Buffer
  status: number
}

interface BoundedBodyOptions {
  maxBytes: number
  timeoutMs: number
}

const DEFAULT_BINARY_MAX_RESPONSE_BYTES = 10 * 1024 * 1024
const DEFAULT_JSON_MAX_RESPONSE_BYTES = 2 * 1024 * 1024

export function isSafeHttpsUrl(url: URL): boolean {
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && (!url.port || url.port === '443')
    && isPublicNetworkHostname(url.hostname)
}

function upstreamError(message: string, statusCode: number, statusMessage: string, cause?: unknown): Error {
  return Object.assign(new Error(message, cause === undefined ? undefined : { cause }), {
    statusCode,
    statusMessage,
  })
}

function resolveMaxResponseBytes(value: number | undefined, fallback: number): number {
  const maxBytes = value ?? fallback
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
    throw new TypeError('maxResponseBytes must be a non-negative safe integer')
  return maxBytes
}

async function cancelBody(body: ReadableStream<Uint8Array> | null | undefined, error?: Error): Promise<void> {
  if (!body)
    return
  await body.cancel(error).catch((cancelError) => {
    if (error) {
      Object.assign(error, { cause: cancelError })
      return
    }
    throw cancelError
  })
}

async function readBoundedResponseBody(
  body: ReadableStream<Uint8Array> | null | undefined,
  options: BoundedBodyOptions,
): Promise<Uint8Array> {
  if (!body)
    return new Uint8Array()

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutError = upstreamError('Upstream response body timed out', 504, 'Gateway Timeout')
  const timeout = options.timeoutMs > 0
    ? new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(timeoutError)
          void reader.cancel(timeoutError).catch(cancelError => Object.assign(timeoutError, { cause: cancelError }))
        }, options.timeoutMs)
      })
    : undefined

  try {
    while (true) {
      const result = await (timeout ? Promise.race([reader.read(), timeout]) : reader.read())
      if (result.done)
        break

      size += result.value.byteLength
      if (size > options.maxBytes) {
        const error = upstreamError(
          `Upstream response exceeded ${options.maxBytes} bytes`,
          502,
          'Upstream response too large',
        )
        await reader.cancel(error).catch(cancelError => Object.assign(error, { cause: cancelError }))
        throw error
      }
      chunks.push(result.value)
    }
  }
  finally {
    if (timeoutId !== undefined)
      clearTimeout(timeoutId)
  }

  const data = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    data.set(chunk, offset)
    offset += chunk.byteLength
  }
  return data
}

async function rejectResponse(
  response: FetchResponse<ReadableStream<Uint8Array>>,
  error: Error,
): Promise<never> {
  await cancelBody(response._data, error)
  throw error
}

async function assertSuccessfulResponse(
  response: FetchResponse<ReadableStream<Uint8Array>>,
  ignoreResponseError: boolean,
): Promise<void> {
  if (!ignoreResponseError && response.status >= 400 && response.status < 600) {
    await rejectResponse(response, upstreamError(
      `Upstream request failed with status ${response.status}`,
      response.status,
      response.statusText || 'Upstream request failed',
    ))
  }
}

function parseUpstreamUrl(url: string): URL {
  try {
    return new URL(url)
  }
  catch (cause) {
    throw upstreamError('Upstream URL is invalid', 400, 'Invalid upstream URL', cause)
  }
}

function assertAllowedUrl(url: URL, allowUrl: ((url: URL) => boolean) | undefined): void {
  if (allowUrl && !allowUrl(url))
    throw upstreamError('Upstream URL is not allowed', 403, 'Upstream URL not allowed')
}

function resolveRedirect(
  response: Pick<Response, 'headers' | 'status'>,
  currentUrl: URL,
  redirectCount: number,
  config: CachedBinaryFetchConfig,
): URL | undefined {
  if (response.status < 300 || response.status >= 400 || response.status === 304)
    return

  const location = response.headers.get('location')
  if (!location)
    throw upstreamError('Upstream redirect has no Location header', 502, 'Invalid upstream redirect')
  if (redirectCount >= (config.maxRedirects ?? 5))
    throw upstreamError('Upstream redirect limit exceeded', 502, 'Too many upstream redirects')

  let nextUrl: URL
  try {
    nextUrl = new URL(location, currentUrl)
  }
  catch (cause) {
    throw upstreamError('Upstream redirect URL is invalid', 502, 'Invalid upstream redirect', cause)
  }
  assertAllowedUrl(nextUrl, config.allowUrl)
  return nextUrl
}

/**
 * Cache upstream binary/image fetches. Returns a helper that restores the
 * response body as a Buffer so the handler can pipe it straight to the client.
 */
export function createCachedBinaryFetch(
  name: string,
  maxAge: number,
  config: CachedBinaryFetchConfig = {},
): (url: string, opts?: CachedBinaryFetchOptions) => Promise<CachedBinaryResult> {
  const maxResponseBytes = resolveMaxResponseBytes(config.maxResponseBytes, DEFAULT_BINARY_MAX_RESPONSE_BYTES)
  const cached = defineCachedFunction(
    async (url: string, opts?: CachedBinaryFetchOptions): Promise<CachedBinaryResponse & { status: number }> => {
      let currentUrl = parseUpstreamUrl(url)
      assertAllowedUrl(currentUrl, config.allowUrl)
      let response: FetchResponse<ReadableStream<Uint8Array>>
      const network = await createPublicNetworkDispatcher()
      const safeFetch = createFetch({ fetch: network.fetch })

      try {
        for (let redirectCount = 0; ; redirectCount++) {
          const redirectMode = opts?.redirect ?? (config.allowUrl ? 'follow' : 'manual')
          if (redirectMode === 'follow' && !config.allowUrl)
            throw new Error('Automatic redirects require an allowUrl redirect policy')
          const validateRedirect = redirectMode === 'follow'
          response = await safeFetch.raw(currentUrl.toString(), {
            responseType: 'stream' as const,
            timeout: opts?.timeout ?? 10000,
            redirect: validateRedirect ? 'manual' : redirectMode,
            ignoreResponseError: true,
            headers: opts?.headers,
          })

          if (!validateRedirect)
            break

          let nextUrl: URL | undefined
          try {
            nextUrl = resolveRedirect(response, currentUrl, redirectCount, config)
          }
          catch (error) {
            await rejectResponse(response, error as Error)
          }
          if (!nextUrl)
            break
          await cancelBody(response._data)
          currentUrl = nextUrl
        }

        await assertSuccessfulResponse(response, opts?.ignoreResponseError ?? false)
        const data = await readBoundedResponseBody(response._data, {
          maxBytes: maxResponseBytes,
          timeoutMs: opts?.timeout ?? 10000,
        })
        return {
          base64: data.byteLength ? Buffer.from(data).toString('base64') : '',
          contentType: response.headers.get('content-type'),
          status: response.status,
        }
      }
      finally {
        await network.close()
      }
    },
    {
      name,
      maxAge,
      swr: true,
      staleMaxAge: maxAge,
      getKey: (url: string, opts?: CachedBinaryFetchOptions) => {
        if (!opts)
          return hash(url)
        // Vary on headers + redirect mode — callers with different user agents
        // or redirect policies may get different upstream responses.
        const parts = [url]
        if (opts.headers) {
          const entries = Object.entries(opts.headers).sort(([a], [b]) => a.localeCompare(b))
          for (const [k, v] of entries)
            parts.push(`${k}=${v}`)
        }
        if (opts.redirect)
          parts.push(`redirect=${opts.redirect}`)
        if (opts.ignoreResponseError !== undefined)
          parts.push(`ignoreResponseError=${opts.ignoreResponseError}`)
        return hash(parts)
      },
    },
  )
  return async (url, opts) => {
    const result = await cached(url, opts)
    return {
      ...result,
      body: result.base64 ? Buffer.from(result.base64, 'base64') : Buffer.alloc(0),
    }
  }
}

/**
 * Cache upstream JSON/text fetches. `getKey` is caller-controlled so handlers
 * can normalize on whichever inner params identify the resource (tweet ID,
 * post URL, query hash). The normalized value is hashed before it reaches
 * Nitro storage because raw URLs can contain reserved key characters.
 */
export function createCachedJsonFetch<T>(
  name: string,
  maxAge: number,
  getKey: (url: string, opts?: { headers?: Record<string, string> }) => string,
  config: CachedJsonFetchConfig<T>,
): (url: string, opts?: { headers?: Record<string, string>, timeout?: number }) => Promise<T> {
  const maxResponseBytes = resolveMaxResponseBytes(config.maxResponseBytes, DEFAULT_JSON_MAX_RESPONSE_BYTES)
  return defineCachedFunction(
    async (url: string, opts?: { headers?: Record<string, string>, timeout?: number }) => {
      let currentUrl = parseUpstreamUrl(url)
      assertAllowedUrl(currentUrl, config.allowUrl)
      const network = await createPublicNetworkDispatcher()
      const safeFetch = createFetch({ fetch: network.fetch })

      try {
        for (let redirectCount = 0; ; redirectCount++) {
          const response = await safeFetch.raw(currentUrl.toString(), {
            responseType: 'stream',
            timeout: opts?.timeout ?? 10000,
            redirect: 'manual',
            ignoreResponseError: true,
            headers: opts?.headers,
          }) as FetchResponse<ReadableStream<Uint8Array>>
          let nextUrl: URL | undefined
          try {
            nextUrl = resolveRedirect(response, currentUrl, redirectCount, config)
          }
          catch (error) {
            await rejectResponse(response, error as Error)
          }
          if (nextUrl) {
            await cancelBody(response._data)
            currentUrl = nextUrl
            continue
          }

          await assertSuccessfulResponse(response, false)

          if (config.contentTypePrefixes?.length) {
            const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
            if (!contentType || !config.contentTypePrefixes.some(prefix => contentType.startsWith(prefix))) {
              await rejectResponse(
                response,
                upstreamError('Upstream response content type is not allowed', 415, 'Unsupported upstream content type'),
              )
            }
          }

          const rawData = await readBoundedResponseBody(response._data, {
            maxBytes: maxResponseBytes,
            timeoutMs: opts?.timeout ?? 10000,
          })
          const text = new TextDecoder().decode(rawData)
          let data: T
          if (config.responseType === 'text') {
            data = text as T
          }
          else {
            try {
              data = JSON.parse(text) as T
            }
            catch (cause) {
              throw upstreamError('Upstream response is not valid JSON', 502, 'Invalid upstream response', cause)
            }
          }
          config.validateResponse?.(data)
          return data
        }
      }
      finally {
        await network.close()
      }
    },
    {
      name,
      maxAge,
      swr: true,
      staleMaxAge: maxAge,
      getKey: (url, opts) => hash(getKey(url, opts)),
    },
  )
}
