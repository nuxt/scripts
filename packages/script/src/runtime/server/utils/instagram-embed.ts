import { COMMENT_NODE, DOCTYPE_NODE, ELEMENT_NODE, parse, renderSync, TEXT_NODE, walkSync } from 'ultrahtml'
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

const CHARSET_RE = /@charset\s[^;]+;/gi
const IMPORT_RE = /@import\s[^;]+;/gi
const WHITESPACE_RE = /\s/
const AT_RULE_NAME_RE = /@([\w-]+)/
const MULTI_SPACE_RE = /\s+/g
const SRCSET_SPLIT_RE = /\s+/
const SAFE_STYLE_VALUE_RE = /^(?:auto|-?(?:\d+|\d*\.\d+)(?:%|px|em|rem|vh|vw|vmin|vmax)?)(?:\s*\/\s*(?:\d+|\d*\.\d+))?$/i

const SAFE_EMBED_ELEMENTS = new Set([
  'a',
  'abbr',
  'article',
  'aside',
  'b',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'ol',
  'p',
  'picture',
  'pre',
  'q',
  's',
  'samp',
  'section',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'track',
  'tr',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
])

const SAFE_GLOBAL_ATTRIBUTES = new Set([
  'class',
  'dir',
  'hidden',
  'lang',
  'role',
  'style',
  'title',
])

const SAFE_ELEMENT_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target']),
  blockquote: new Set(['cite']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  del: new Set(['cite', 'datetime']),
  img: new Set(['alt', 'decoding', 'height', 'loading', 'sizes', 'src', 'srcset', 'width']),
  ins: new Set(['cite', 'datetime']),
  li: new Set(['value']),
  ol: new Set(['reversed', 'start', 'type']),
  q: new Set(['cite']),
  source: new Set(['height', 'media', 'sizes', 'src', 'srcset', 'type', 'width']),
  td: new Set(['colspan', 'headers', 'rowspan']),
  th: new Set(['abbr', 'colspan', 'headers', 'rowspan', 'scope']),
  time: new Set(['datetime']),
  track: new Set(['default', 'kind', 'label', 'src', 'srclang']),
  video: new Set(['autoplay', 'controls', 'height', 'loop', 'muted', 'playsinline', 'poster', 'preload', 'src', 'width']),
}

const SAFE_INLINE_STYLE_PROPERTIES = new Set([
  'aspect-ratio',
  'height',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'padding-bottom',
  'padding-top',
  'width',
])

const INSTAGRAM_ACTION_LABELS: Record<string, string> = {
  Comments: 'Comment on Instagram',
  Likes: 'View likes on Instagram',
  Save: 'Save this post on Instagram',
  Share: 'Share this post on Instagram',
}

const SHELL_NODE_IDS = new Set(['has-finished-comet-page', 'splash-screen'])

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

export interface SanitizedInstagramEmbed {
  bodyHtml: string
  cssUrls: string[]
}

/**
 * Sanitize Instagram's server-rendered embed before returning it to the browser.
 *
 * The response is upstream HTML rendered through `v-html`, so this uses a small
 * allowlist instead of relying on Instagram to keep serving inert markup. It
 * also restricts all navigations and media to the Instagram origins expected
 * by the embed, and returns only trusted stylesheet URLs for the server to
 * fetch.
 */
export function sanitizeInstagramEmbedHtml(
  html: string,
  prefix = '/_scripts',
  secret?: string,
): SanitizedInstagramEmbed {
  const ast = parse(html)
  const cssUrls: string[] = []

  walkSync(ast, (node) => {
    if (node.type === COMMENT_NODE || node.type === DOCTYPE_NODE) {
      removeNode(node)
      return
    }

    if (node.type !== ELEMENT_NODE)
      return

    const name = node.name.toLowerCase()

    if (name === 'link') {
      const rel = node.attributes.rel?.toLowerCase().split(/\s+/) || []
      const href = node.attributes.href
      if (rel.includes('stylesheet') && href && isAllowedInstagramAssetUrl(href))
        cssUrls.push(href)
      removeNode(node)
      return
    }

    if (!SAFE_EMBED_ELEMENTS.has(name)
      || (node.attributes.id && SHELL_NODE_IDS.has(node.attributes.id))) {
      removeNode(node)
      return
    }

    sanitizeAttributes(node, name, prefix, secret)

    if (name === 'img' && !node.attributes.alt?.trim())
      node.attributes.alt = 'Instagram post image'

    if (name === 'a' && node.attributes.href && !node.attributes['aria-label']?.trim()) {
      const classes = node.attributes.class?.split(/\s+/) || []
      const actionClass = classes.find(className => INSTAGRAM_ACTION_LABELS[className])
      if (actionClass)
        node.attributes['aria-label'] = INSTAGRAM_ACTION_LABELS[actionClass]!
    }
  })

  let bodyNode: any = null
  walkSync(ast, (node) => {
    if (node.type === ELEMENT_NODE && node.name.toLowerCase() === 'body')
      bodyNode = node
  })

  return {
    bodyHtml: bodyNode
      ? bodyNode.children.map((child: any) => renderSync(child)).join('')
      : renderSync(ast),
    cssUrls,
  }
}

function removeNode(node: any): void {
  node.type = TEXT_NODE
  node.value = ''
  node.name = undefined
  node.attributes = {}
  node.children = []
}

function sanitizeAttributes(node: any, elementName: string, prefix: string, secret?: string): void {
  const elementAttributes = SAFE_ELEMENT_ATTRIBUTES[elementName]

  for (const attributeName of Object.keys(node.attributes)) {
    const normalizedName = attributeName.toLowerCase()
    const isAriaAttribute = normalizedName.startsWith('aria-')
    const isAllowed = isAriaAttribute
      || SAFE_GLOBAL_ATTRIBUTES.has(normalizedName)
      || elementAttributes?.has(normalizedName)

    if (!isAllowed || normalizedName.startsWith('on'))
      delete node.attributes[attributeName]
  }

  if (node.attributes.style) {
    const style = sanitizeInlineStyle(node.attributes.style)
    if (style)
      node.attributes.style = style
    else
      delete node.attributes.style
  }

  if (elementName === 'a') {
    const href = sanitizeInstagramNavigationUrl(node.attributes.href)
    if (href) {
      node.attributes.href = href
      node.attributes.target = '_blank'
      node.attributes.rel = 'noopener noreferrer'
    }
    else {
      delete node.attributes.href
      delete node.attributes.target
      delete node.attributes.rel
    }
  }

  for (const attributeName of ['src', 'poster']) {
    if (!node.attributes[attributeName])
      continue
    const url = sanitizeInstagramMediaUrl(node.attributes[attributeName], prefix, secret)
    if (url)
      node.attributes[attributeName] = url
    else
      delete node.attributes[attributeName]
  }

  if (node.attributes.srcset) {
    const srcset = sanitizeInstagramSrcset(node.attributes.srcset, prefix, secret)
    if (srcset)
      node.attributes.srcset = srcset
    else
      delete node.attributes.srcset
  }

  for (const attributeName of ['cite']) {
    if (!node.attributes[attributeName])
      continue
    const url = sanitizeInstagramNavigationUrl(node.attributes[attributeName])
    if (url)
      node.attributes[attributeName] = url
    else
      delete node.attributes[attributeName]
  }
}

function sanitizeInstagramNavigationUrl(value: string | undefined): string | undefined {
  if (!value)
    return undefined
  try {
    const url = new URL(value.replace(AMP_RE, '&'))
    if (url.protocol !== 'https:')
      return undefined
    if (url.hostname !== 'instagram.com' && url.hostname !== 'www.instagram.com')
      return undefined
    return value
  }
  catch {
    return undefined
  }
}

function sanitizeInstagramMediaUrl(
  value: string,
  prefix: string,
  secret?: string,
): string | undefined {
  try {
    const url = new URL(value.replace(AMP_RE, '&'))
    if (url.protocol !== 'https:')
      return undefined
    if (url.hostname !== INSTAGRAM_ASSET_HOST
      && !INSTAGRAM_IMAGE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.cdninstagram.com'))) {
      return undefined
    }
    return rewriteUrl(value, prefix, secret)
  }
  catch {
    return undefined
  }
}

function sanitizeInstagramSrcset(value: string, prefix: string, secret?: string): string {
  return value
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(SRCSET_SPLIT_RE)
      const url = parts[0] ? sanitizeInstagramMediaUrl(parts[0], prefix, secret) : undefined
      const descriptor = parts.slice(1).join(' ')
      return url ? `${url}${descriptor ? ` ${descriptor}` : ''}` : ''
    })
    .filter(Boolean)
    .join(', ')
}

function sanitizeInlineStyle(value: string): string {
  return value
    .split(';')
    .map((declaration) => {
      const separator = declaration.indexOf(':')
      if (separator === -1)
        return ''
      const property = declaration.slice(0, separator).trim().toLowerCase()
      const propertyValue = declaration.slice(separator + 1).trim()
      if (!SAFE_INLINE_STYLE_PROPERTIES.has(property) || !SAFE_STYLE_VALUE_RE.test(propertyValue))
        return ''
      return `${property}: ${propertyValue}`
    })
    .filter(Boolean)
    .join('; ')
}

function isAllowedInstagramAssetUrl(value: string): boolean {
  try {
    const url = new URL(value.replace(AMP_RE, '&'))
    return url.protocol === 'https:' && url.hostname === INSTAGRAM_ASSET_HOST
  }
  catch {
    return false
  }
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
