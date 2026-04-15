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
import {
  PAGE_TOKEN_MAX_AGE,
  PAGE_TOKEN_PARAM,
  PAGE_TOKEN_TS_PARAM,
  SIG_LENGTH,
  SIG_PARAM,
} from './sign-constants'

export { PAGE_TOKEN_MAX_AGE, PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM, SIG_LENGTH, SIG_PARAM }

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

// ---------------------------------------------------------------------------
// Page tokens: stateless, short-lived access tokens for client-side proxy use
// ---------------------------------------------------------------------------

/**
 * Generate a page token that authorizes client-side proxy requests.
 *
 * Embedded in the SSR payload so the browser can attach it to reactive proxy
 * URL updates without needing a `/sign` round-trip. The token is scoped to
 * a timestamp and expires after `PAGE_TOKEN_MAX_AGE` seconds.
 *
 * Construction: first 16 hex chars of `HMAC(secret, "proxy-access:<timestamp>")`.
 */
export function generateProxyToken(secret: string, timestamp: number): string {
  return createHmac('sha256', secret)
    .update(`proxy-access:${timestamp}`)
    .digest('hex')
    .slice(0, SIG_LENGTH)
}

/**
 * Verify a page token against the current time.
 *
 * Returns `true` if the token matches the HMAC for the given timestamp AND
 * the timestamp is within `maxAge` seconds of `now`.
 */
export function verifyProxyToken(
  token: string,
  timestamp: number,
  secret: string,
  maxAge: number = PAGE_TOKEN_MAX_AGE,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!token || !secret || typeof timestamp !== 'number')
    return false
  if (token.length !== SIG_LENGTH)
    return false

  // Reject expired or future tokens (future tolerance: 60s for clock skew)
  const age = now - timestamp
  if (age > maxAge || age < -60)
    return false

  const expected = generateProxyToken(secret, timestamp)
  return constantTimeEqual(expected, token)
}

/**
 * Verify a request against either a URL signature or a page token.
 *
 * Two verification modes, checked in order:
 *
 * 1. **URL signature** (`sig` param): the exact URL was signed server-side
 *    during SSR/prerender. Locked to the specific path + query params.
 *
 * 2. **Page token** (`_pt` + `_ts` params): the client received a short-lived
 *    token during SSR and is making a reactive proxy request with new params.
 *    Valid for any params on the target path, but expires after `maxAge`.
 *
 * Returns `false` if neither mode validates.
 */
export function verifyProxyRequest(event: H3Event, secret: string, maxAge?: number): boolean {
  if (!secret)
    return false

  const query = getQuery(event) as Record<string, unknown>

  // Mode 1: exact URL signature
  const rawSig = query[SIG_PARAM]
  const sig = Array.isArray(rawSig) ? rawSig[0] : rawSig
  if (typeof sig === 'string' && sig.length === SIG_LENGTH) {
    const path = (event.path || '').split('?')[0] || ''
    const expected = signProxyUrl(path, query, secret)
    if (constantTimeEqual(expected, sig))
      return true
  }

  // Mode 2: page token
  const rawToken = query[PAGE_TOKEN_PARAM]
  const rawTs = query[PAGE_TOKEN_TS_PARAM]
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  const ts = Array.isArray(rawTs) ? rawTs[0] : rawTs
  if (typeof token === 'string' && ts !== undefined) {
    const timestamp = Number(ts)
    if (!Number.isNaN(timestamp))
      return verifyProxyToken(token, timestamp, secret, maxAge)
  }

  return false
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
