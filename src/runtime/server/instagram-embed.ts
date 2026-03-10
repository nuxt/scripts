import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'

const LINK_RE = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
const LINK_RE_2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi
const RSRC_RE = /url\(\/rsrc\.php([^)]+)\)/g
const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi
const STYLESHEET_RE = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi
const CSS_RE = /<link[^>]+href=["'][^"']+\.css[^"']*["'][^>]*>/gi
const NOSCRIPT_RE = /<noscript>[\s\S]*?<\/noscript>/gi
const SCONTENT_RE = /https:\/\/scontent[^"'\s),]+\.cdninstagram\.com[^"'\s),]+/g
const STATIC_CDN_RE = /https:\/\/static\.cdninstagram\.com[^"'\s),]+/g
const LOOKASIDE_RE = /https:\/\/lookaside\.instagram\.com[^"'\s),]+/g
const AMP_RE = /&amp;/g

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
  const embedUrl = `${cleanUrl}embed/${captions ? 'captioned/' : ''}`

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
  let match
  while ((match = LINK_RE.exec(html)) !== null) {
    if (match[1])
      cssUrls.push(match[1])
  }
  // Also check href before rel
  while ((match = LINK_RE_2.exec(html)) !== null) {
    if (match[1])
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
    RSRC_RE,
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
    // Remove all scripts - embed works without JS via Googlebot UA
    .replace(SCRIPT_RE, '')
    // Remove link tags (we're inlining CSS)
    .replace(STYLESHEET_RE, '')
    .replace(CSS_RE, '')
    // Remove noscript redirect
    .replace(NOSCRIPT_RE, '')
    // Rewrite scontent CDN images (decode &amp; entities before encoding)
    .replace(
      SCONTENT_RE,
      m => `/api/_scripts/instagram-embed-image?url=${encodeURIComponent(m.replace(AMP_RE, '&'))}`,
    )
    // Rewrite static CDN assets
    .replace(
      STATIC_CDN_RE,
      m => `/api/_scripts/instagram-embed-asset?url=${encodeURIComponent(m.replace(AMP_RE, '&'))}`,
    )
    // Rewrite lookaside Instagram images (SEO/crawler images)
    .replace(
      LOOKASIDE_RE,
      m => `/api/_scripts/instagram-embed-image?url=${encodeURIComponent(m.replace(AMP_RE, '&'))}`,
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
