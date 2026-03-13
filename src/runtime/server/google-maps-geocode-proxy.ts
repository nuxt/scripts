import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const privateConfig = (runtimeConfig['nuxt-scripts'] as any)?.googleMapsGeocodeProxy

  const apiKey = privateConfig?.apiKey
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Maps API key not configured for geocode proxy',
    })
  }

  const query = getQuery(event)
  const { key: _clientKey, ...safeQuery } = query

  const geocodeUrl = withQuery('https://maps.googleapis.com/maps/api/geocode/json', {
    ...safeQuery,
    key: apiKey,
  })

  const data = await $fetch(geocodeUrl, {
    headers: {
      'User-Agent': 'Nuxt Scripts Google Geocode Proxy',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to geocode',
    })
  })

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=86400')

  return data
})
