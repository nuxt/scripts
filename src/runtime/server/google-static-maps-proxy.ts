import { createError, defineEventHandler, getHeader, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { useRuntimeConfig } from '#imports'

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

  // Validate referer to prevent external abuse
  const referer = getHeader(event, 'referer')
  const host = getHeader(event, 'host')
  if (referer && host) {
    const refererUrl = new URL(referer).host
    if (refererUrl !== host) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid referer',
      })
    }
  }

  const query = getQuery(event)

  // Remove any client-provided key and use server-side key
  const { key: _clientKey, ...safeQuery } = query

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
