import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const postUrl = query.url as string
  const captions = query.captions === 'true'

  if (!postUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post URL is required',
    })
  }

  // Validate Instagram URL
  const parsedUrl = new URL(postUrl)
  if (!['instagram.com', 'www.instagram.com'].includes(parsedUrl.hostname)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Instagram URL',
    })
  }

  const cleanUrl = parsedUrl.origin + parsedUrl.pathname
  const embedUrl = cleanUrl + 'embed/' + (captions ? 'captioned/' : '')

  const html = await $fetch<string>(embedUrl, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Instagram embed',
    })
  })

  // Rewrite image URLs to proxy through our endpoint
  const rewrittenHtml = html
    // Rewrite scontent CDN images
    .replace(
      /https:\/\/scontent\.cdninstagram\.com([^"'\s)]+)/g,
      '/api/_scripts/instagram-embed-image?url=' + encodeURIComponent('https://scontent.cdninstagram.com') + '$1',
    )
    // Rewrite static CDN CSS/assets
    .replace(
      /https:\/\/static\.cdninstagram\.com([^"'\s)]+)/g,
      '/api/_scripts/instagram-embed-asset?url=' + encodeURIComponent('https://static.cdninstagram.com') + '$1',
    )
    // Remove Instagram's embed.js script (we don't need it)
    .replace(/<script[^>]*src="[^"]*embed\.js"[^>]*><\/script>/gi, '')

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'text/html')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return rewrittenHtml
})
