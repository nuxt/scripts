import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { withQuery } from 'ufo'
import { createCachedJsonFetch } from './utils/cached-upstream'
import { withSigning } from './utils/withSigning'

// Addresses rarely change; a 30-day cache avoids billable geocode lookups for
// the same address on every page render. Keyed on the upstream URL (the API
// key is server-injected, so identical across requests).
const cachedGeocodeFetch = createCachedJsonFetch<any>(
  'nuxt-scripts-geocode',
  2592000,
  url => url,
)

export default withSigning(defineEventHandler(async (event) => {
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

  const data = await cachedGeocodeFetch(geocodeUrl, {
    headers: { 'User-Agent': 'Nuxt Scripts Google Geocode Proxy' },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to geocode',
    })
  })

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=86400')

  return data
}))
