import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { withQuery } from 'ufo'
import { createCachedBinaryFetch } from './utils/cached-upstream'
import { PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM, SIG_PARAM } from './utils/sign-constants'
import { withSigning } from './utils/withSigning'

// Static maps by (center, zoom, size, style, markers, ...) are essentially
// immutable; a 7-day cache drastically reduces billable map loads for the
// common "same map on every page visit" case.
const cachedMapFetch = createCachedBinaryFetch('nuxt-scripts-static-map', 604800)

// Strip query params that vary per-request (auth artefacts + client-provided
// API key) so the cache key is pinned to the actual map being requested.
const STRIP_PARAMS = new Set([SIG_PARAM, PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM, 'key'])

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

  const query = getQuery(event)
  const safeQuery: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(query)) {
    if (!STRIP_PARAMS.has(k))
      safeQuery[k] = v
  }

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

  const cacheMaxAge = publicConfig.cacheMaxAge || 3600
  setHeader(event, 'Content-Type', result.contentType || 'image/png')
  setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
  setHeader(event, 'Vary', 'Accept-Encoding')

  return result.body
}))
