import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { ELEMENT_NODE, parse, renderSync, TEXT_NODE, walkSync } from 'ultrahtml'
import { rewriteUrl, rewriteUrlsInText, RSRC_RE, scopeCss } from './utils/instagram-embed'
import { withSigning } from './utils/withSigning'

export { proxyAssetUrl, proxyImageUrl, rewriteUrl, rewriteUrlsInText, scopeCss } from './utils/instagram-embed'

const EMBED_INSTAGRAM_SUFFIX_RE = /\/embed\/instagram$/
const SRCSET_SPLIT_RE = /\s+/

/**
 * Remove a node from the AST by converting it to an empty text node.
 * Setting node.name = '' produces broken HTML (attributes still render as `< attr="...">`).
 */
function removeNode(node: any): void {
  node.type = TEXT_NODE
  node.value = ''
  node.name = undefined
  node.attributes = {}
  node.children = []
}

export default withSigning(defineEventHandler(async (event) => {
  // Derive the scripts prefix from the handler's own route path.
  // The route is registered as `<prefix>/embed/instagram`, so strip `/embed/instagram`.
  const handlerPath = event.path?.split('?')[0] || ''
  const prefix = handlerPath.replace(EMBED_INSTAGRAM_SUFFIX_RE, '') || '/_scripts'

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
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Instagram embed',
    })
  })

  const ast = parse(html)

  // Collect CSS URLs from link[rel=stylesheet] tags, then remove them
  const cssUrls: string[] = []

  walkSync(ast, (node) => {
    if (node.type !== ELEMENT_NODE)
      return

    if (node.name === 'link' && node.attributes.rel === 'stylesheet' && node.attributes.href) {
      cssUrls.push(node.attributes.href)
      removeNode(node)
      return
    }

    if (node.name === 'script' || node.name === 'noscript' || node.name === 'style') {
      removeNode(node)
      return
    }

    for (const attr of ['src', 'poster']) {
      if (node.attributes[attr])
        node.attributes[attr] = rewriteUrl(node.attributes[attr], prefix)
    }

    if (node.attributes.srcset) {
      node.attributes.srcset = node.attributes.srcset
        .split(',')
        .map((entry: string) => {
          const parts = entry.trim().split(SRCSET_SPLIT_RE)
          const url = parts[0]
          const descriptor = parts.slice(1).join(' ')
          return url ? `${rewriteUrl(url, prefix)}${descriptor ? ` ${descriptor}` : ''}` : entry
        })
        .join(', ')
    }

    if (node.attributes.style)
      node.attributes.style = rewriteUrlsInText(node.attributes.style, prefix)
  })

  walkSync(ast, (node) => {
    if (node.type === TEXT_NODE && node.value)
      node.value = rewriteUrlsInText(node.value, prefix)
  })

  let bodyNode: any = null
  walkSync(ast, (node) => {
    if (node.type === ELEMENT_NODE && node.name === 'body')
      bodyNode = node
  })

  const bodyHtml = bodyNode
    ? bodyNode.children.map((child: any) => renderSync(child)).join('')
    : renderSync(ast)

  const cssContents = await Promise.all(
    cssUrls.map(url =>
      $fetch<string>(url, {
        headers: { Accept: 'text/css' },
      }).catch(() => ''),
    ),
  )

  let combinedCss = cssContents.join('\n')
  combinedCss = combinedCss.replace(
    RSRC_RE,
    (_m, path) => `url(${prefix}/embed/instagram-asset?url=${encodeURIComponent(`https://static.cdninstagram.com/rsrc.php${path}`)})`,
  )
  combinedCss = rewriteUrlsInText(combinedCss, prefix)
  combinedCss = scopeCss(combinedCss, '.instagram-embed-root')

  const baseStyles = `
    .instagram-embed-root { background: white; max-width: 540px; width: calc(100% - 2px); border-radius: 3px; border: 1px solid rgb(219, 219, 219); display: block; margin: 0px 0px 12px; min-width: 326px; padding: 0px; }
    .instagram-embed-root #splash-screen { display: none !important; }
    .instagram-embed-root .Embed { opacity: 1 !important; visibility: visible !important; }
    .instagram-embed-root .EmbeddedMedia, .instagram-embed-root .EmbeddedMediaImage { display: block !important; visibility: visible !important; }
  `

  const result = `<div class="instagram-embed-root"><style>${baseStyles}\n${combinedCss}</style>${bodyHtml}</div>`

  setHeader(event, 'Content-Type', 'text/html')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return result
}))
