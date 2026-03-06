import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, getHeader, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'

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
