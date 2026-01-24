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

  // Parse and validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(postUrl)
  }
  catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid postUrl',
    })
  }

  if (!['instagram.com', 'www.instagram.com'].includes(parsedUrl.hostname)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Instagram URL',
    })
  }

  const pathname = parsedUrl.pathname.endsWith('/') ? parsedUrl.pathname : `${parsedUrl.pathname}/`
  const cleanUrl = parsedUrl.origin + pathname
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
    // Rewrite scontent CDN images (handles regional subdomains like scontent-syd2-1)
    .replace(
      /https:\/\/scontent[^.]*\.cdninstagram\.com[^"'\s),]+/g,
      m => `/api/_scripts/instagram-embed-image?url=${encodeURIComponent(m)}`,
    )
    // Rewrite static CDN CSS/assets
    .replace(
      /https:\/\/static\.cdninstagram\.com[^"'\s),]+/g,
      m => `/api/_scripts/instagram-embed-asset?url=${encodeURIComponent(m)}`,
    )
    // Remove all script tags (security + we don't need interactivity)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'text/html')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return rewrittenHtml
})
