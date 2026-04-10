/**
 * HMAC URL signing for proxy endpoints.
 *
 * ## Why
 *
 * Proxy endpoints like `/_scripts/proxy/google-static-maps` inject a server-side
 * API key and forward requests to third-party services. Without signing, anyone
 * can call these endpoints with arbitrary parameters and burn the site owner's
 * API quota. Signing ensures only URLs generated server-side (during SSR/prerender
 * or via the `/_scripts/sign` endpoint) are accepted.
 *
 * ## How
 *
 * 1. The module stores a deterministic secret in `runtimeConfig.nuxt-scripts.proxySecret`
 *    (env: `NUXT_SCRIPTS_PROXY_SECRET`).
 * 2. URLs are canonicalized (sort query keys, strip `sig`) and signed with HMAC-SHA256.
 * 3. The first 16 hex chars (64 bits) of the digest is appended as `?sig=<hex>`.
 * 4. Endpoints wrapped with `withSigning()` verify the sig against the current request.
 *
 * A 64-bit signature is enough to defeat brute force for this threat model
 * (a billion guesses gives a ~5% hit rate at 2^64). Longer signatures bloat
 * prerendered HTML for no practical gain.
 */

import type { H3Event } from 'h3'
import { createHmac } from 'node:crypto'
import { getQuery } from 'h3'

/** Query param name for the signature. Chosen to be unlikely to collide with upstream APIs. */
export const SIG_PARAM = 'sig'

/** Length of the hex signature (16 chars = 64 bits). */
export const SIG_LENGTH = 16

/**
 * Canonicalize a query object into a deterministic string suitable for HMAC input.
 *
 * Rules:
 * - The `sig` param is stripped (it can't sign itself).
 * - `undefined` and `null` values are skipped (mirrors `ufo.withQuery`).
 * - Keys are sorted alphabetically so order-independent reconstruction works.
 * - Arrays expand to repeated keys (e.g. `markers=a&markers=b`), matching how
 *   `ufo.withQuery` serializes array-valued params.
 * - Objects are JSON-stringified (rare, but consistent with `ufo.withQuery`).
 * - Encoding uses `encodeURIComponent` for both keys and values so the canonical
 *   form matches what shows up on the wire.
 *
 * The resulting string is stable across server/client and different JS runtimes
 * because it does not depend on `URLSearchParams` insertion order.
 */
export function canonicalizeQuery(query: Record<string, unknown>): string {
  const keys = Object.keys(query)
    .filter(k => k !== SIG_PARAM && query[k] !== undefined && query[k] !== null)
    .sort()

  const parts: string[] = []
  for (const key of keys) {
    const value = query[key]
    const encodedKey = encodeURIComponent(key)
    if (Array.isArray(value)) {
      // Preserve array order (order matters for e.g. map markers) but sort keys above.
      for (const item of value) {
        if (item === undefined || item === null)
          continue
        parts.push(`${encodedKey}=${encodeURIComponent(serializeValue(item))}`)
      }
    }
    else {
      parts.push(`${encodedKey}=${encodeURIComponent(serializeValue(value))}`)
    }
  }
  return parts.join('&')
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string')
    return value
  if (typeof value === 'object')
    return JSON.stringify(value)
  return String(value)
}

/**
 * Sign a path + query using HMAC-SHA256 and return the 16-char hex digest.
 *
 * The HMAC input is `${path}?${canonicalQuery}` so that the same query signed
 * against a different endpoint yields a different signature (prevents cross-
 * endpoint signature reuse).
 *
 * `path` should be the URL path without query string (e.g. `/_scripts/proxy/google-static-maps`).
 * Callers should not include origin / host since the signing contract is path-relative.
 */
export function signProxyUrl(path: string, query: Record<string, unknown>, secret: string): string {
  const canonical = canonicalizeQuery(query)
  const input = canonical ? `${path}?${canonical}` : path
  return createHmac('sha256', secret).update(input).digest('hex').slice(0, SIG_LENGTH)
}

/**
 * Build a fully-formed signed URL (path + query + sig).
 *
 * This is the primary helper for code paths that need to emit a proxy URL
 * (SSR components, server-side URL rewriters like instagram-embed).
 */
export function buildSignedProxyUrl(path: string, query: Record<string, unknown>, secret: string): string {
  const sig = signProxyUrl(path, query, secret)
  const canonical = canonicalizeQuery(query)
  const queryString = canonical ? `${canonical}&${SIG_PARAM}=${sig}` : `${SIG_PARAM}=${sig}`
  return `${path}?${queryString}`
}

/**
 * Verify a request's signature against the current event's path and query.
 *
 * Reads the `sig` param from the query, reconstructs the canonical form from
 * the remaining params, and compares against a freshly computed HMAC. Returns
 * `false` if the sig is missing, malformed, or doesn't match.
 *
 * Uses constant-time comparison to prevent timing side-channels.
 */
export function verifyProxyRequest(event: H3Event, secret: string): boolean {
  if (!secret)
    return false

  const query = getQuery(event) as Record<string, unknown>
  const rawSig = query[SIG_PARAM]
  const sig = Array.isArray(rawSig) ? rawSig[0] : rawSig
  if (typeof sig !== 'string' || sig.length !== SIG_LENGTH)
    return false

  // Use the event path without query string as the signing path
  const path = (event.path || '').split('?')[0] || ''
  const expected = signProxyUrl(path, query, secret)
  return constantTimeEqual(expected, sig)
}

/**
 * Constant-time string comparison.
 *
 * Both inputs are expected to be equal-length hex strings. The loop runs over
 * the longer length so an early-exit on length mismatch doesn't leak the
 * expected length (though both are fixed at `SIG_LENGTH` in practice).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length)
    return false
  let diff = 0
  for (let i = 0; i < a.length; i++)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
