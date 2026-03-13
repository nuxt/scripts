import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { ELEMENT_NODE, parse, renderSync, TEXT_NODE, walkSync } from 'ultrahtml'

export const RSRC_RE = /url\(\/rsrc\.php([^)]+)\)/g
export const AMP_RE = /&amp;/g
export const SCONTENT_RE = /https:\/\/scontent[^"'\s),]+\.cdninstagram\.com[^"'\s),]+/g
export const STATIC_CDN_RE = /https:\/\/static\.cdninstagram\.com[^"'\s),]+/g
export const LOOKASIDE_RE = /https:\/\/lookaside\.instagram\.com[^"'\s),]+/g
export const INSTAGRAM_IMAGE_HOSTS = ['scontent.cdninstagram.com', 'lookaside.instagram.com']
export const INSTAGRAM_ASSET_HOST = 'static.cdninstagram.com'

const CHARSET_RE = /@charset\s[^;]+;/gi
const IMPORT_RE = /@import\s[^;]+;/gi
const WHITESPACE_RE = /\s/
const AT_RULE_NAME_RE = /@([\w-]+)/
const MULTI_SPACE_RE = /\s+/g
const SRCSET_SPLIT_RE = /\s+/

export function proxyImageUrl(url: string): string {
  return `/_scripts/embed/instagram-image?url=${encodeURIComponent(url.replace(AMP_RE, '&'))}`
}

export function proxyAssetUrl(url: string): string {
  return `/_scripts/embed/instagram-asset?url=${encodeURIComponent(url.replace(AMP_RE, '&'))}`
}

export function rewriteUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === INSTAGRAM_ASSET_HOST)
      return proxyAssetUrl(url)
    if (INSTAGRAM_IMAGE_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.cdninstagram.com`)))
      return proxyImageUrl(url)
  }
  catch {}
  return url
}

export function rewriteUrlsInText(text: string): string {
  return text
    .replace(SCONTENT_RE, m => proxyImageUrl(m))
    .replace(STATIC_CDN_RE, m => proxyAssetUrl(m))
    .replace(LOOKASIDE_RE, m => proxyImageUrl(m))
}

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

/**
 * Scope CSS rules under a parent selector and strip global/page-level rules.
 * Removes :root, html, body selectors and @charset/@import at-rules.
 */
export function scopeCss(css: string, scopeSelector: string): string {
  // Remove @charset and @import at-rules
  let result = css.replace(CHARSET_RE, '')
  result = result.replace(IMPORT_RE, '')

  // Process the CSS rule by rule using a simple state machine
  return processRules(result, scopeSelector)
}

function processRules(css: string, scopeSelector: string): string {
  const output: string[] = []
  let i = 0

  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && WHITESPACE_RE.test(css[i]!)) i++
    if (i >= css.length)
      break

    // Handle @-rules
    if (css[i] === '@') {
      const atRule = extractAtRule(css, i)
      if (atRule) {
        // Skip @charset, @import (already removed above)
        // For @media, @supports, @keyframes etc., include as-is
        const atName = atRule.content.match(AT_RULE_NAME_RE)?.[1]?.toLowerCase()
        if (atName === 'media' || atName === 'supports' || atName === 'layer') {
          // Scope the inner rules
          const braceStart = atRule.content.indexOf('{')
          const innerCss = atRule.content.slice(braceStart + 1, -1)
          const scopedInner = processRules(innerCss, scopeSelector)
          output.push(`${atRule.content.slice(0, braceStart + 1) + scopedInner}}`)
        }
        else if (atName === 'keyframes' || atName === '-webkit-keyframes' || atName === 'font-face') {
          // Keep as-is (keyframes/font-face are global by nature)
          output.push(atRule.content)
        }
        // Skip other at-rules (e.g., @page)
        i = atRule.end
        continue
      }
    }

    // Extract a regular rule (selector { ... })
    const bracePos = css.indexOf('{', i)
    if (bracePos === -1)
      break

    const selector = css.slice(i, bracePos).trim()
    const block = extractBlock(css, bracePos)
    if (!block)
      break

    i = block.end

    // Skip empty selectors
    if (!selector)
      continue

    // Strip rules targeting :root, html, body (page-level selectors)
    const selectors = selector.split(',').map(s => s.trim())
    const filteredSelectors = selectors.filter((s) => {
      const normalized = s.replace(MULTI_SPACE_RE, ' ').trim().toLowerCase()
      return normalized !== ':root'
        && normalized !== 'html'
        && normalized !== 'body'
        && !normalized.startsWith(':root ')
        && !normalized.startsWith('html ')
        && !normalized.startsWith('body ')
        && normalized !== 'html, body'
    })

    if (filteredSelectors.length === 0)
      continue

    // Scope each selector
    const scopedSelectors = filteredSelectors.map((s) => {
      // Don't scope selectors that are already scoped or are pseudo-elements on :root
      return `${scopeSelector} ${s}`
    })

    output.push(`${scopedSelectors.join(', ')} ${block.content}`)
  }

  return output.join('\n')
}

function extractAtRule(css: string, start: number): { content: string, end: number } | null {
  const bracePos = css.indexOf('{', start)
  const semiPos = css.indexOf(';', start)

  // Simple at-rule (no block)
  if (semiPos !== -1 && (bracePos === -1 || semiPos < bracePos)) {
    return { content: css.slice(start, semiPos + 1), end: semiPos + 1 }
  }

  if (bracePos === -1)
    return null

  const block = extractBlock(css, bracePos)
  if (!block)
    return null

  return {
    content: css.slice(start, bracePos) + block.content,
    end: block.end,
  }
}

function extractBlock(css: string, openBrace: number): { content: string, end: number } | null {
  let depth = 0
  for (let j = openBrace; j < css.length; j++) {
    if (css[j] === '{') {
      depth++
    }
    else if (css[j] === '}') {
      depth--
      if (depth === 0) {
        return { content: css.slice(openBrace, j + 1), end: j + 1 }
      }
    }
  }
  return null
}

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

    // Collect stylesheet URLs
    if (node.name === 'link' && node.attributes.rel === 'stylesheet' && node.attributes.href) {
      cssUrls.push(node.attributes.href)
      removeNode(node)
      return
    }

    // Remove script, noscript, and style tags (inline styles contain global :root rules)
    if (node.name === 'script' || node.name === 'noscript' || node.name === 'style') {
      removeNode(node)
      return
    }

    // Rewrite image/asset URLs in attributes
    for (const attr of ['src', 'poster']) {
      if (node.attributes[attr])
        node.attributes[attr] = rewriteUrl(node.attributes[attr])
    }

    // srcset is comma-separated "<url> <descriptor>" entries
    if (node.attributes.srcset) {
      node.attributes.srcset = node.attributes.srcset
        .split(',')
        .map((entry: string) => {
          const parts = entry.trim().split(SRCSET_SPLIT_RE)
          const url = parts[0]
          const descriptor = parts.slice(1).join(' ')
          return url ? `${rewriteUrl(url)}${descriptor ? ` ${descriptor}` : ''}` : entry
        })
        .join(', ')
    }

    // Rewrite URLs in style attributes
    if (node.attributes.style)
      node.attributes.style = rewriteUrlsInText(node.attributes.style)
  })

  // Also rewrite URLs in text nodes (inline styles in CSS blocks, etc.)
  walkSync(ast, (node) => {
    if (node.type === TEXT_NODE && node.value)
      node.value = rewriteUrlsInText(node.value)
  })

  // Extract body content only (avoid leaking <html id="facebook"> onto the page)
  let bodyNode: any = null
  walkSync(ast, (node) => {
    if (node.type === ELEMENT_NODE && node.name === 'body')
      bodyNode = node
  })

  const bodyHtml = bodyNode
    ? bodyNode.children.map((child: any) => renderSync(child)).join('')
    : renderSync(ast)

  // Fetch all CSS files in parallel
  const cssContents = await Promise.all(
    cssUrls.map(url =>
      $fetch<string>(url, {
        headers: { Accept: 'text/css' },
      }).catch(() => ''),
    ),
  )

  // Combine CSS, rewrite image URLs, and scope under embed root
  let combinedCss = cssContents.join('\n')
  combinedCss = combinedCss.replace(
    RSRC_RE,
    (_m, path) => `url(/_scripts/embed/instagram-asset?url=${encodeURIComponent(`https://static.cdninstagram.com/rsrc.php${path}`)})`,
  )
  combinedCss = rewriteUrlsInText(combinedCss)
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
})
