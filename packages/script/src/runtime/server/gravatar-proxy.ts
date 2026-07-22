import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { withQuery } from 'ufo'
import { createCachedBinaryFetch, isSafeHttpsUrl } from './utils/cached-upstream'
import { withSigning } from './utils/withSigning'

// Gravatar avatars keyed on `hash + sizing/default/rating` are essentially
// immutable for the hour timescale; a 1-hour cache balances freshness (users
// rotating avatars) against origin-shielding upstream traffic.
const GRAVATAR_HASH_RE = /^[a-f\d]{64}$/i
const GRAVATAR_RATINGS = new Set(['g', 'pg', 'r', 'x'])
function firstString(value: unknown): string | undefined {
  return Array.isArray(value)
    ? (typeof value[0] === 'string' ? value[0] : undefined)
    : (typeof value === 'string' ? value : undefined)
}

const cachedGravatarFetch = createCachedBinaryFetch('nuxt-scripts-gravatar', 3600, {
  allowUrl: url => isSafeHttpsUrl(url)
    && (url.hostname === 'gravatar.com' || url.hostname.endsWith('.gravatar.com')),
})

export default withSigning(defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const proxyConfig = (runtimeConfig.public['nuxt-scripts'] as any)?.gravatarProxy

  const query = getQuery(event)
  let hash = firstString(query.hash)
  const email = firstString(query.email)

  if (hash && !GRAVATAR_HASH_RE.test(hash)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Hash must be a 64-character SHA-256 hex digest',
    })
  }

  // Server-side hashing: email never leaves your server
  if (!hash && email) {
    const encoder = new TextEncoder()
    const data = encoder.encode(email.trim().toLowerCase())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    hash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  if (!hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Either hash or email parameter is required',
    })
  }

  // Build Gravatar URL with query params
  const rawSize = firstString(query.s) || '80'
  const size = Number(rawSize)
  const defaultImg = firstString(query.d) || 'mp'
  const rating = (firstString(query.r) || 'g').toLowerCase()

  if (!Number.isInteger(size) || size < 1 || size > 2048) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Gravatar size must be an integer from 1 to 2048',
    })
  }
  if (!GRAVATAR_RATINGS.has(rating)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Gravatar rating',
    })
  }

  const gravatarUrl = withQuery(`https://www.gravatar.com/avatar/${hash}`, {
    s: String(size),
    d: defaultImg,
    r: rating,
  })

  const result = await cachedGravatarFetch(gravatarUrl, {
    headers: { 'User-Agent': 'Nuxt Scripts Gravatar Proxy' },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Gravatar avatar',
    })
  })

  const cacheMaxAge = proxyConfig?.cacheMaxAge ?? 3600
  const responseContentType = result.contentType
  const upstreamContentType = responseContentType?.split(';', 1)[0]?.trim().toLowerCase()
  if (!responseContentType || !upstreamContentType?.startsWith('image/') || upstreamContentType === 'image/svg+xml') {
    throw createError({
      statusCode: 415,
      statusMessage: 'Unsupported upstream content type',
    })
  }

  setHeader(event, 'Content-Type', responseContentType)
  setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
  setHeader(event, 'Content-Security-Policy', 'sandbox; default-src \'none\'')
  setHeader(event, 'Vary', 'Accept-Encoding')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return result.body
}))
