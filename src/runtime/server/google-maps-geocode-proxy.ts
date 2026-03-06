import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, getHeader, getQuery, getRequestIP, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { validateProxyCsrf } from './utils/proxy-csrf'

const MAX_INPUT_LENGTH = 200
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

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
  const publicConfig = (runtimeConfig.public['nuxt-scripts'] as any)?.googleGeocodeProxy
  const privateConfig = (runtimeConfig['nuxt-scripts'] as any)?.googleGeocodeProxy

  if (!publicConfig?.enabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Google Geocode proxy is not enabled',
    })
  }

  const apiKey = privateConfig?.apiKey
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Maps API key not configured for geocode proxy',
    })
  }

  // CSRF validation (double-submit cookie pattern)
  validateProxyCsrf(event)

  // Rate limit by IP
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many geocode requests',
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
  const input = query.input as string

  if (!input) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing "input" query parameter',
    })
  }

  if (input.length > MAX_INPUT_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Input too long (max ${MAX_INPUT_LENGTH} characters)`,
    })
  }

  const googleUrl = withQuery('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
    input,
    inputtype: 'textquery',
    fields: 'name,geometry',
    key: apiKey,
  })

  const data = await $fetch<{ candidates: Array<{ geometry: { location: { lat: number, lng: number } }, name: string }>, status: string }>(googleUrl, {
    headers: {
      'User-Agent': 'Nuxt Scripts Google Geocode Proxy',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to geocode query',
    })
  })

  if (data.status !== 'OK' || !data.candidates?.[0]?.geometry?.location) {
    throw createError({
      statusCode: 404,
      statusMessage: `No location found for "${input}"`,
    })
  }

  const location = data.candidates[0].geometry.location

  // Cache aggressively - place names rarely change coordinates
  const cacheMaxAge = publicConfig.cacheMaxAge || 86400
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
  setHeader(event, 'Vary', 'Accept-Encoding')

  return { lat: location.lat, lng: location.lng, name: data.candidates[0].name }
})
