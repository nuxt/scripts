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
      // Use simple UA - full Chrome UA triggers JS-heavy version without static content
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Instagram embed',
    })
  })

  // Extract CSS URLs from link tags
  const cssUrls: string[] = []
  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    cssUrls.push(match[1])
  }
  // Also check href before rel
  const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi
  while ((match = linkRegex2.exec(html)) !== null) {
    cssUrls.push(match[1])
  }

  // Fetch all CSS files in parallel
  const cssContents = await Promise.all(
    cssUrls.map(url =>
      $fetch<string>(url, {
        headers: { Accept: 'text/css' },
      }).catch(() => ''),
    ),
  )

  // Combine CSS and rewrite image URLs inside CSS
  let combinedCss = cssContents.join('\n')
  combinedCss = combinedCss.replace(
    /url\(\/rsrc\.php([^)]+)\)/g,
    (_m, path) => `url(/api/_scripts/instagram-embed-asset?url=${encodeURIComponent(`https://static.cdninstagram.com/rsrc.php${path}`)})`,
  )

  // Base styles to ensure visibility without JS
  const baseStyles = `
    html { background: white; max-width: 540px; width: calc(100% - 2px); border-radius: 3px; border: 1px solid rgb(219, 219, 219); display: block; margin: 0px 0px 12px; min-width: 326px; padding: 0px; }
    #splash-screen { display: none !important; }
    .Embed { opacity: 1 !important; visibility: visible !important; }
    .EmbeddedMedia, .EmbeddedMediaImage { display: block !important; visibility: visible !important; }
  `

  let rewrittenHtml = html
    // Remove link tags (we're inlining CSS)
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/<link[^>]+href=["'][^"']+\.css[^"']*["'][^>]*>/gi, '')
    // Remove noscript redirect
    .replace(/<noscript>[\s\S]*?<\/noscript>/gi, '')
    // Rewrite scontent CDN images (decode &amp; entities before encoding)
    .replace(
      /https:\/\/scontent[^"'\s),]+\.cdninstagram\.com[^"'\s),]+/g,
      m => `/api/_scripts/instagram-embed-image?url=${encodeURIComponent(m.replace(/&amp;/g, '&'))}`,
    )
    // Rewrite static CDN assets
    .replace(
      /https:\/\/static\.cdninstagram\.com[^"'\s),]+/g,
      m => `/api/_scripts/instagram-embed-asset?url=${encodeURIComponent(m.replace(/&amp;/g, '&'))}`,
    )

  // Inject inlined CSS into head
  rewrittenHtml = rewrittenHtml.replace(
    '</head>',
    `<style>${baseStyles}\n${combinedCss}</style></head>`,
  )

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'text/html')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return rewrittenHtml
})
