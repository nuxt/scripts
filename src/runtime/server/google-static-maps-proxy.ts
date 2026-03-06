import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, getHeader, getQuery, getRequestIP, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

const ALLOWED_PARAMS = new Set([
  'center', 'zoom', 'size', 'scale', 'format', 'maptype',
  'language', 'region', 'markers', 'path', 'visible',
  'style', 'map_id', 'signature',
])

const requestCounts = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const publicConfig = (runtimeConfig.public['nuxt-scripts'] as any)?.googleStaticMapsProxy
  const privateConfig = (runtimeConfig['nuxt-scripts'] as any)?.googleStaticMapsProxy

  if (!publicConfig?.enabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Google Static Maps proxy is not enabled',
    })
  }

  // Get API key from private config (server-side only, not exposed to client)
  const apiKey = privateConfig?.apiKey
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Maps API key not configured for proxy',
    })
  }

  // Rate limit by IP
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many static map requests',
    })
  }

  // Validate referer to prevent external abuse
  const referer = getHeader(event, 'referer')
  const host = getHeader(event, 'host')
  if (referer && host) {
    let refererHost: string | undefined
    try {
      refererHost = new URL(referer).host
    }
    catch {}
    if (refererHost && refererHost !== host) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid referer',
      })
    }
  }

  const query = getQuery(event)

  // Only allow known Static Maps API parameters
  const safeQuery: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(query)) {
    if (ALLOWED_PARAMS.has(k))
      safeQuery[k] = v
  }

  const googleMapsUrl = withQuery('https://maps.googleapis.com/maps/api/staticmap', {
    ...safeQuery,
    key: apiKey,
  })

  const response = await $fetch.raw(googleMapsUrl, {
    headers: {
      'User-Agent': 'Nuxt Scripts Google Static Maps Proxy',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch static map',
    })
  })

  const cacheMaxAge = publicConfig.cacheMaxAge || 3600
  setHeader(event, 'Content-Type', response.headers.get('content-type') || 'image/png')
  setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
  setHeader(event, 'Vary', 'Accept-Encoding')

  return response._data
})
