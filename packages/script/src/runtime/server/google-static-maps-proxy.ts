import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { withQuery } from 'ufo'
import { createCachedBinaryFetch, isSafeHttpsUrl } from './utils/cached-upstream'
import { stripProxyAuthQuery } from './utils/proxy-query'
import { withSigning } from './utils/withSigning'

// Static maps by (center, zoom, size, style, markers, ...) are essentially
// immutable; a 7-day cache drastically reduces billable map loads for the
// common "same map on every page visit" case.
const cachedMapFetch = createCachedBinaryFetch('nuxt-scripts-static-map', 604800, {
  allowUrl: url => isSafeHttpsUrl(url) && url.hostname === 'maps.googleapis.com',
})

export default withSigning(defineEventHandler(async (event) => {
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

  const query = stripProxyAuthQuery(getQuery(event))
  const { key: _clientKey, ...safeQuery } = query

  const googleMapsUrl = withQuery('https://maps.googleapis.com/maps/api/staticmap', {
    ...safeQuery,
    key: apiKey,
  })

  const result = await cachedMapFetch(googleMapsUrl, {
    headers: { 'User-Agent': 'Nuxt Scripts Google Static Maps Proxy' },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch static map',
    })
  })

  const contentType = result.contentType?.split(';', 1)[0]?.trim().toLowerCase()
  if (!contentType?.startsWith('image/') || contentType === 'image/svg+xml') {
    throw createError({
      statusCode: 415,
      statusMessage: 'Unsupported upstream content type',
    })
  }

  const cacheMaxAge = publicConfig.cacheMaxAge || 3600
  setHeader(event, 'Content-Type', result.contentType!)
  setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
  setHeader(event, 'Vary', 'Accept-Encoding')
  setHeader(event, 'Content-Security-Policy', 'sandbox; default-src \'none\'; base-uri \'none\'; form-action \'none\'')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return result.body
}))
