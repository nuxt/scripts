import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createCachedJsonFetch } from './utils/cached-upstream'
import { isEmbedShell, isSafeInstagramCssUrl, isSafeInstagramEmbedUrl, isSafeInstagramPostUrl, sanitizeInstagramEmbedCss, sanitizeInstagramEmbedHtml } from './utils/instagram-embed'
import { withSigning } from './utils/withSigning'

export { proxyAssetUrl, proxyImageUrl, rewriteUrl, rewriteUrlsInText, scopeCss } from './utils/instagram-embed'

const EMBED_INSTAGRAM_SUFFIX_RE = /\/embed\/instagram$/

// Instagram embed HTML is semi-fresh (likes, captions may update); 10min
// matches the outbound Cache-Control header and dedupes per post+captions.
// Throws on shell responses so nitro doesn't cache them.
const cachedEmbedFetch = createCachedJsonFetch<string>(
  'nuxt-scripts-instagram-embed-v3',
  600,
  (url, opts) => {
    const parts = [url]
    for (const [key, value] of Object.entries(opts?.headers || {}).sort(([a], [b]) => a.localeCompare(b)))
      parts.push(`${key}=${value}`)
    return parts.join('\n')
  },
  {
    allowUrl: isSafeInstagramEmbedUrl,
    responseType: 'text',
    contentTypePrefixes: ['text/html'],
    validateResponse: (html) => {
      if (isEmbedShell(html)) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Instagram returned an empty embed shell (post unavailable or upstream rate-limiting)',
        })
      }
    },
  },
)

// Static CSS from Instagram's CDN is versioned; 24h cache is safe because the
// URL itself changes when content does.
const cachedCssFetch = createCachedJsonFetch<string>(
  'nuxt-scripts-instagram-css',
  86400,
  url => url,
  {
    allowUrl: isSafeInstagramCssUrl,
    responseType: 'text',
    contentTypePrefixes: ['text/css'],
  },
)

export default withSigning(defineEventHandler(async (event) => {
  // Derive the scripts prefix from the handler's own route path.
  // The route is registered as `<prefix>/embed/instagram`, so strip `/embed/instagram`.
  const handlerPath = event.path?.split('?')[0] || ''
  const prefix = handlerPath.replace(EMBED_INSTAGRAM_SUFFIX_RE, '') || '/_scripts'
  const secret = (useRuntimeConfig(event)['nuxt-scripts'] as { proxySecret?: string } | undefined)?.proxySecret

  const query = getQuery(event)
  const postUrl = query.url as string
  const captions = query.captions === 'true'

  if (!postUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post URL is required',
    })
  }

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

  if (!isSafeInstagramPostUrl(parsedUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Instagram URL',
    })
  }

  const pathname = parsedUrl.pathname.endsWith('/') ? parsedUrl.pathname : `${parsedUrl.pathname}/`
  const cleanUrl = parsedUrl.origin + pathname
  const embedUrl = `${cleanUrl}embed/${captions ? 'captioned/' : ''}`

  const html = await cachedEmbedFetch(embedUrl, {
    headers: {
      'Accept': 'text/html',
      // Meta's own crawler UA. Googlebot's UA is also accepted by Instagram
      // but is IP-verified, so it fails from hosts outside Google's ranges
      // (e.g. Cloudflare/Vercel) and Instagram serves the JS shell instead
      // of the SSR'd post.
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Instagram embed',
    })
  })

  const { bodyHtml, cssUrls } = sanitizeInstagramEmbedHtml(html, prefix, secret)

  const cssContents = await Promise.all(
    cssUrls.map(url =>
      cachedCssFetch(url, {
        headers: { Accept: 'text/css' },
      }).catch(() => {
        // Styles are optional presentation. A failed stylesheet must not hide valid post content.
        return ''
      }),
    ),
  )

  const combinedCss = sanitizeInstagramEmbedCss(cssContents.join('\n'), '.instagram-embed-root', prefix, secret)

  const baseStyles = `
    .instagram-embed-root { background: white; max-width: 540px; width: calc(100% - 2px); border-radius: 3px; border: 1px solid rgb(219, 219, 219); display: block; margin: 0px 0px 12px; min-width: 326px; padding: 0px; }
    .instagram-embed-root #splash-screen { display: none !important; }
    .instagram-embed-root .Embed { opacity: 1 !important; visibility: visible !important; }
    .instagram-embed-root .EmbeddedMedia, .instagram-embed-root .EmbeddedMediaImage { display: block !important; visibility: visible !important; }
  `

  const result = `<div class="instagram-embed-root"><style>${baseStyles}\n${combinedCss}</style>${bodyHtml}</div>`

  setHeader(event, 'Content-Type', 'text/html')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')
  setHeader(event, 'Content-Security-Policy', 'sandbox; default-src \'none\'')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return result
}))
