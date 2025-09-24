import type { EventHandler } from 'h3'
import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const proxyConfig = (runtimeConfig.public['nuxt-scripts'] as any)?.googleStaticMapsProxy

  if (!proxyConfig?.enabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Google Static Maps proxy is not enabled',
    })
  }

  // Get query parameters from the request
  const query = getQuery(event)

  // Validate required parameters
  if (!query.key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'API key is required',
    })
  }

  // Build the Google Static Maps API URL
  const googleMapsUrl = withQuery('https://maps.googleapis.com/maps/api/staticmap', query)

  try {
    // Fetch the image from Google Static Maps API
    const response = await $fetch.raw(googleMapsUrl, {
      headers: {
        'User-Agent': 'Nuxt Scripts Google Static Maps Proxy',
      },
    })

    // Set appropriate headers for caching and content type
    const cacheMaxAge = proxyConfig.cacheMaxAge || 3600
    setHeader(event, 'Content-Type', response.headers.get('content-type') || 'image/png')
    setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
    setHeader(event, 'Vary', 'Accept-Encoding')

    // Add CORS headers if needed
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

    return response._data
  }
  catch (error: any) {
    // Log error for debugging
    console.error('Google Static Maps Proxy Error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch static map',
    })
  }
}) as EventHandler
