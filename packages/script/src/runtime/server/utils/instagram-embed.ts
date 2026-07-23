import { ELEMENT_NODE, parse, renderSync, TEXT_NODE, walkSync } from 'ultrahtml'
import { buildProxyUrl } from './proxy-url'

export const RSRC_RE = /url\(\/rsrc\.php([^)]+)\)/g

// Instagram serves a JS-only shell (splash-screen + comet sentinel, no SSR'd
// post markup) when it can't or won't render server-side — e.g. for bot UAs
// it can't verify, or for removed/private posts.
const SHELL_BODY_RE = /id=["'](?:splash-screen|has-finished-comet-page)["']/
// Match Embed / EmbeddedMedia / EmbeddedMediaImage as tokens inside any
// class attribute (single- or double-quoted, multi-class lists).
const HAS_POST_CONTENT_RE = /\bclass=(["'])[^"']*\b(?:Embed|EmbeddedMedia|EmbeddedMediaImage)\b[^"']*\1/i

export function isEmbedShell(html: string): boolean {
  return SHELL_BODY_RE.test(html) && !HAS_POST_CONTENT_RE.test(html)
}

export const AMP_RE = /&amp;/g
export const SCONTENT_RE = /https:\/\/scontent[^"'\s),]+\.cdninstagram\.com[^"'\s),]+/g
export const STATIC_CDN_RE = /https:\/\/static\.cdninstagram\.com[^"'\s),]+/g
export const LOOKASIDE_RE = /https:\/\/lookaside\.instagram\.com[^"'\s),]+/g
export const INSTAGRAM_IMAGE_HOSTS = ['scontent.cdninstagram.com', 'lookaside.instagram.com']
export const INSTAGRAM_ASSET_HOST = 'static.cdninstagram.com'

const INSTAGRAM_POST_PATH_RE = /^\/(?:p|reel|tv)\/[^/]+\/?$/
const INSTAGRAM_EMBED_PATH_RE = /^\/(?:p|reel|tv)\/[^/]+\/embed\/(?:captioned\/)?$/
const BLOCKED_EMBED_TAGS = new Set([
  'base',
  'button',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'option',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
])
const EMBED_URL_ATTRS = new Set(['action', 'formaction', 'href', 'xlink:href'])
const CSS_URL_RE = /url\(([^)]*)\)/gi
const DANGEROUS_STYLE_RE = /expression\s*\(|@import|-moz-binding|behavior\s*:/i
const SRCSET_SPLIT_RE = /\s+/

const CHARSET_RE = /@charset\s[^;]+;/gi
const IMPORT_RE = /@import\s[^;]+;/gi
const WHITESPACE_RE = /\s/
const AT_RULE_NAME_RE = /@([\w-]+)/
const MULTI_SPACE_RE = /\s+/g

function isSafeInstagramOrigin(url: URL): boolean {
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && (!url.port || url.port === '443')
    && (url.hostname === 'instagram.com' || url.hostname === 'www.instagram.com')
}

export function isSafeInstagramPostUrl(url: URL): boolean {
  return isSafeInstagramOrigin(url) && INSTAGRAM_POST_PATH_RE.test(url.pathname)
}

export function isSafeInstagramEmbedUrl(url: URL): boolean {
  return isSafeInstagramOrigin(url) && INSTAGRAM_EMBED_PATH_RE.test(url.pathname)
}

export function isSafeInstagramCssUrl(url: URL): boolean {
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && (!url.port || url.port === '443')
    && url.hostname === INSTAGRAM_ASSET_HOST
}

function removeNode(node: any): void {
  node.type = TEXT_NODE
  node.value = ''
  node.name = undefined
  node.attributes = {}
  node.children = []
}

function isSafeNavigationUrl(value: string): boolean {
  if (!/^(?:https?:\/\/|\/|#)/i.test(value))
    return false
  try {
    const url = new URL(value, 'https://www.instagram.com')
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  }
  catch {
    return false
  }
}

function sanitizeCssUrls(css: string, proxyPrefix: string): string {
  const allowedPrefix = `${proxyPrefix}/embed/instagram-`
  return css.replace(CSS_URL_RE, (match, rawValue: string) => {
    const trimmed = rawValue.trim()
    const first = trimmed[0]
    const value = (first === '"' || first === '\'') && trimmed.at(-1) === first
      ? trimmed.slice(1, -1).trim()
      : trimmed
    return value.startsWith(allowedPrefix) ? match : 'url("")'
  })
}

function rewriteMediaUrl(url: string, prefix: string, secret?: string): string | undefined {
  const rewritten = rewriteUrl(url, prefix, secret)
  return rewritten === url ? undefined : rewritten
}

export function sanitizeInstagramEmbedHtml(
  html: string,
  prefix: string,
  secret?: string,
): { bodyHtml: string, cssUrls: string[] } {
  const ast = parse(html)
  const cssUrls: string[] = []

  walkSync(ast, (node) => {
    if (node.type !== ELEMENT_NODE)
      return

    const tag = String(node.name).toLowerCase()
    if (tag === 'link' && node.attributes.rel?.toLowerCase() === 'stylesheet' && node.attributes.href) {
      try {
        const cssUrl = new URL(node.attributes.href)
        if (isSafeInstagramCssUrl(cssUrl))
          cssUrls.push(cssUrl.toString())
      }
      catch {
        // Invalid stylesheet URLs are removed with the link node.
      }
    }
    if (BLOCKED_EMBED_TAGS.has(tag)) {
      removeNode(node)
      return
    }

    for (const [name, value] of Object.entries(node.attributes as Record<string, string>)) {
      const lowerName = name.toLowerCase()
      if (lowerName.startsWith('on') || lowerName === 'srcdoc' || lowerName === 'nonce') {
        delete node.attributes[name]
        continue
      }
      if (EMBED_URL_ATTRS.has(lowerName) && !isSafeNavigationUrl(value)) {
        delete node.attributes[name]
        continue
      }
      if (lowerName === 'src' || lowerName === 'poster') {
        const rewritten = rewriteMediaUrl(value, prefix, secret)
        if (rewritten)
          node.attributes[name] = rewritten
        else
          delete node.attributes[name]
        continue
      }
      if (lowerName === 'srcset') {
        const entries = value.split(',').flatMap((entry) => {
          const [url, descriptor, ...rest] = entry.trim().split(SRCSET_SPLIT_RE)
          const rewritten = url ? rewriteMediaUrl(url, prefix, secret) : undefined
          const safeDescriptor = !descriptor || /^\d+(?:\.\d+)?[wx]$/.test(descriptor)
          return rewritten && safeDescriptor && rest.length === 0
            ? [`${rewritten}${descriptor ? ` ${descriptor}` : ''}`]
            : []
        })
        if (entries.length)
          node.attributes[name] = entries.join(', ')
        else
          delete node.attributes[name]
        continue
      }
      if (lowerName === 'style') {
        const rewritten = rewriteUrlsInText(value, prefix, secret)
        if (DANGEROUS_STYLE_RE.test(rewritten))
          delete node.attributes[name]
        else
          node.attributes[name] = sanitizeCssUrls(rewritten, prefix)
      }
    }

    if (tag === 'a' && node.attributes.target?.toLowerCase() === '_blank')
      node.attributes.rel = 'noopener noreferrer'
  })

  let bodyNode: any
  walkSync(ast, (node) => {
    if (node.type === ELEMENT_NODE && node.name === 'body')
      bodyNode = node
  })

  return {
    bodyHtml: bodyNode
      ? bodyNode.children.map((child: any) => renderSync(child)).join('')
      : renderSync(ast),
    cssUrls,
  }
}

export function sanitizeInstagramEmbedCss(
  css: string,
  scopeSelector: string,
  prefix: string,
  secret?: string,
): string {
  const rewritten = rewriteUrlsInText(
    css.replace(RSRC_RE, (_match, path) => `url(${proxyAssetUrl(`https://${INSTAGRAM_ASSET_HOST}/rsrc.php${path}`, prefix, secret)})`),
    prefix,
    secret,
  )
  return sanitizeCssUrls(scopeCss(rewritten, scopeSelector), prefix).replace(/<\/style/gi, '<\\/style')
}

export function proxyImageUrl(url: string, prefix = '/_scripts', secret?: string): string {
  return buildProxyUrl(`${prefix}/embed/instagram-image`, { url: url.replace(AMP_RE, '&') }, secret)
}

export function proxyAssetUrl(url: string, prefix = '/_scripts', secret?: string): string {
  return buildProxyUrl(`${prefix}/embed/instagram-asset`, { url: url.replace(AMP_RE, '&') }, secret)
}

export function rewriteUrl(url: string, prefix = '/_scripts', secret?: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === INSTAGRAM_ASSET_HOST)
      return proxyAssetUrl(url, prefix, secret)
    if (INSTAGRAM_IMAGE_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.cdninstagram.com`)))
      return proxyImageUrl(url, prefix, secret)
  }
  catch {
    // Non-URL values are left unchanged by design.
  }
  return url
}

export function rewriteUrlsInText(text: string, prefix = '/_scripts', secret?: string): string {
  return text
    .replace(SCONTENT_RE, m => proxyImageUrl(m, prefix, secret))
    .replace(STATIC_CDN_RE, m => proxyAssetUrl(m, prefix, secret))
    .replace(LOOKASIDE_RE, m => proxyImageUrl(m, prefix, secret))
}

/**
 * Scope CSS rules under a parent selector and strip global/page-level rules.
 * Removes :root, html, body selectors and @charset/@import at-rules.
 */
export function scopeCss(css: string, scopeSelector: string): string {
  let result = css.replace(CHARSET_RE, '')
  result = result.replace(IMPORT_RE, '')
  return processRules(result, scopeSelector)
}

function processRules(css: string, scopeSelector: string): string {
  const output: string[] = []
  let i = 0

  while (i < css.length) {
    while (i < css.length && WHITESPACE_RE.test(css[i]!)) i++
    if (i >= css.length)
      break

    if (css[i] === '@') {
      const atRule = extractAtRule(css, i)
      if (atRule) {
        const atName = atRule.content.match(AT_RULE_NAME_RE)?.[1]?.toLowerCase()
        if (atName === 'media' || atName === 'supports' || atName === 'layer') {
          const braceStart = atRule.content.indexOf('{')
          // Statement-form (e.g. `@layer foo;`) has no block — preserve as-is.
          if (braceStart === -1) {
            output.push(atRule.content)
          }
          else {
            const innerCss = atRule.content.slice(braceStart + 1, -1)
            const scopedInner = processRules(innerCss, scopeSelector)
            output.push(`${atRule.content.slice(0, braceStart + 1)}${scopedInner}}`)
          }
        }
        else if (atName === 'keyframes' || atName === '-webkit-keyframes' || atName === 'font-face') {
          output.push(atRule.content)
        }
        i = atRule.end
        continue
      }
    }

    const bracePos = css.indexOf('{', i)
    if (bracePos === -1)
      break

    const selector = css.slice(i, bracePos).trim()
    const block = extractBlock(css, bracePos)
    if (!block)
      break

    i = block.end

    if (!selector)
      continue

    const selectors = splitTopLevel(selector, ',').map(s => s.trim())
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

    const scopedSelectors = filteredSelectors.map(s => `${scopeSelector} ${s}`)

    output.push(`${scopedSelectors.join(', ')} ${block.content}`)
  }

  return output.join('\n')
}

function extractAtRule(css: string, start: number): { content: string, end: number } | null {
  const bracePos = css.indexOf('{', start)
  const semiPos = css.indexOf(';', start)

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

/**
 * Split a string on `separator` only at top level, respecting parentheses,
 * brackets, and quoted strings. This keeps nested commas inside `:is(.a, .b)`,
 * `[attr="a,b"]`, etc. intact.
 */
function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === quote)
        quote = null
      continue
    }
    if (ch === '"' || ch === '\'') {
      quote = ch
      continue
    }
    if (ch === '(' || ch === '[') {
      depth++
      continue
    }
    if (ch === ')' || ch === ']') {
      depth--
      continue
    }
    if (ch === separator && depth === 0) {
      parts.push(input.slice(start, i))
      start = i + 1
    }
  }
  parts.push(input.slice(start))
  return parts
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
