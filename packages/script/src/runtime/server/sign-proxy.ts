/**
 * Sign-on-demand endpoint for reactive client-side proxy URLs.
 *
 * ## Why this exists
 *
 * Most proxy URLs are built server-side during SSR/prerender and embedded in
 * HTML with a signature already attached; the client just uses them verbatim.
 * But some components rebuild their URLs reactively on the client after mount
 * (e.g. `ScriptGoogleMapsStaticMap` recomputes `size` from measured element
 * dimensions). Those URLs need a fresh signature, and the client cannot sign
 * them itself without leaking the secret.
 *
 * This endpoint takes a `{ path, query }` request, validates it, and returns
 * a signed URL. It's the only way for client code to obtain a signature.
 *
 * ## Threat model
 *
 * The endpoint is itself the new attack surface: anything the client can get
 * signed, an attacker can also get signed. Mitigations:
 *
 * 1. **Signable path allowlist**: only routes explicitly marked
 *    `requiresSigning: true` in the registry can be signed. Arbitrary paths
 *    are rejected with 403.
 * 2. **Same-origin check**: the `Origin` header must match the request's
 *    `Host` header. This blocks naive cross-site abuse; it's defense-in-depth,
 *    not a complete CSRF solution.
 * 3. **Per-IP rate limiting**: a fixed-window counter in nitro storage caps
 *    sign requests per IP per minute. This effectively caps the rate at which
 *    any single attacker can burn downstream API quota.
 *
 * The domain allowlists on individual proxy handlers provide a separate
 * defense-in-depth against SSRF.
 */

import { useRuntimeConfig } from '#imports'
import {
  createError,
  defineEventHandler,
  getHeader,
  getRequestIP,
  readBody,
} from 'h3'
import { useStorage } from 'nitropack/runtime'
import { buildSignedProxyUrl } from './utils/sign'

/** Per-IP sign requests permitted per minute. */
const RATE_LIMIT_PER_MINUTE = 60

/** Storage key namespace for rate-limit counters. */
const RATE_LIMIT_KEY_PREFIX = 'scripts:sign:ratelimit'

interface SignBody {
  path?: unknown
  query?: unknown
}

interface NuxtScriptsServerConfig {
  proxySecret?: string
  signableRoutes?: string[]
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const scriptsConfig = runtimeConfig['nuxt-scripts'] as NuxtScriptsServerConfig | undefined
  const secret = scriptsConfig?.proxySecret
  const signableRoutes = scriptsConfig?.signableRoutes || []

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Proxy secret not configured',
    })
  }

  // Same-origin check. `Origin` is set by browsers on cross-origin requests
  // and on POST. We require it to match the request's Host, which blocks
  // naive cross-site CSRF-ish abuse. Not a complete CSRF defense (attackers
  // can still craft matching Origin headers from non-browser clients), but
  // raises the bar meaningfully for the common case.
  const origin = getHeader(event, 'origin')
  const host = getHeader(event, 'host')
  if (!origin || !host) {
    throw createError({ statusCode: 403, statusMessage: 'Origin header required' })
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  }
  catch {
    throw createError({ statusCode: 403, statusMessage: 'Invalid Origin header' })
  }
  if (originHost !== host) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin requests forbidden' })
  }

  // Per-IP rate limit. Uses a fixed one-minute bucket keyed by `${ip}:${bucket}`.
  // Simple and cheap; sliding windows are overkill for this endpoint. The TTL
  // is 2 minutes so the bucket survives its own window plus a bit of clock skew.
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const bucket = Math.floor(Date.now() / 60_000)
  const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}:${ip}:${bucket}`
  const storage = useStorage()
  const currentCount = Number((await storage.getItem(rateLimitKey)) ?? 0)
  if (currentCount >= RATE_LIMIT_PER_MINUTE) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many signing requests',
    })
  }
  await storage.setItem(rateLimitKey, currentCount + 1, { ttl: 120 } as any)

  // Parse and validate body. We accept any JSON-serializable query payload but
  // require `path` to be a string so the path allowlist check is sound.
  const body = (await readBody(event).catch(() => null)) as SignBody | null
  if (!body || typeof body.path !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body: { path: string, query: object }' })
  }
  const { path } = body
  const query = (body.query && typeof body.query === 'object' && !Array.isArray(body.query))
    ? body.query as Record<string, unknown>
    : {}

  // Path allowlist check. A path is signable if it equals a registered
  // signable route, or extends one (for `/**` handlers). Using string match
  // with a trailing slash guard prevents prefix hijacking like
  // `/_scripts/proxy/xx-evil` matching `/_scripts/proxy/x`.
  const isSignable = signableRoutes.some(route =>
    path === route || path.startsWith(`${route}/`),
  )
  if (!isSignable) {
    throw createError({ statusCode: 403, statusMessage: 'Path not signable' })
  }

  const url = buildSignedProxyUrl(path, query, secret)
  return { url }
})
