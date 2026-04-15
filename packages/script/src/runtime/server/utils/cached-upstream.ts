import { Buffer } from 'node:buffer'
import { defineCachedFunction } from 'nitropack/runtime'
import { $fetch } from 'ofetch'

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

export interface CachedBinaryResult extends CachedBinaryResponse {
  body: Buffer
  status: number
}

/**
 * Cache upstream binary/image fetches. Returns a helper that restores the
 * response body as a Buffer so the handler can pipe it straight to the client.
 */
export function createCachedBinaryFetch(
  name: string,
  maxAge: number,
): (url: string, opts?: CachedBinaryFetchOptions) => Promise<CachedBinaryResult> {
  const cached = defineCachedFunction(
    async (url: string, opts?: CachedBinaryFetchOptions): Promise<CachedBinaryResponse & { status: number }> => {
      const response = await $fetch.raw(url, {
        responseType: 'arrayBuffer' as const,
        timeout: opts?.timeout ?? 10000,
        redirect: opts?.redirect ?? 'follow',
        ignoreResponseError: opts?.ignoreResponseError ?? false,
        headers: opts?.headers,
      })
      const data = response._data as ArrayBuffer | undefined
      return {
        base64: data ? Buffer.from(data).toString('base64') : '',
        contentType: response.headers.get('content-type'),
        status: response.status,
      }
    },
    {
      name,
      maxAge,
      swr: true,
      staleMaxAge: maxAge,
      getKey: (url: string, opts?: CachedBinaryFetchOptions) => {
        if (!opts)
          return url
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
        return parts.join('|')
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
 * post URL, query hash).
 */
export function createCachedJsonFetch<T>(
  name: string,
  maxAge: number,
  getKey: (url: string, opts?: { headers?: Record<string, string> }) => string,
): (url: string, opts?: { headers?: Record<string, string>, timeout?: number }) => Promise<T> {
  return defineCachedFunction(
    async (url: string, opts?: { headers?: Record<string, string>, timeout?: number }) => {
      return await $fetch<T>(url, {
        timeout: opts?.timeout ?? 10000,
        headers: opts?.headers,
      })
    },
    {
      name,
      maxAge,
      swr: true,
      staleMaxAge: maxAge,
      getKey,
    },
  )
}
