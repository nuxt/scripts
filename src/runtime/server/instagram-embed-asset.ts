import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Asset URL is required',
    })
  }

  // Only allow Instagram static CDN
  const parsedUrl = new URL(url)
  if (parsedUrl.hostname !== 'static.cdninstagram.com') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Domain not allowed',
    })
  }

  const response = await $fetch.raw(url, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch asset',
    })
  })

  const contentType = response.headers.get('content-type') || 'application/octet-stream'

  // Cache assets for 1 day (they're versioned)
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=86400')

  return response._data
})
