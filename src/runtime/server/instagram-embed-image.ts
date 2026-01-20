import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image URL is required',
    })
  }

  // Only allow Instagram CDN domains (any scontent*.cdninstagram.com subdomain)
  const parsedUrl = new URL(url)
  if (!parsedUrl.hostname.endsWith('.cdninstagram.com') && parsedUrl.hostname !== 'scontent.cdninstagram.com') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Domain not allowed',
    })
  }

  const response = await $fetch.raw(url, {
    headers: {
      'Accept': 'image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch image',
    })
  })

  // Cache images for 1 hour
  setHeader(event, 'Content-Type', response.headers.get('content-type') || 'image/jpeg')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')

  return response._data
})
