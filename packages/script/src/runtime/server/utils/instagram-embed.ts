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

export function proxyImageUrl(url: string, prefix = '/_scripts'): string {
  return `${prefix}/embed/instagram-image?url=${encodeURIComponent(url.replace(AMP_RE, '&'))}`
}

export function proxyAssetUrl(url: string, prefix = '/_scripts'): string {
  return `${prefix}/embed/instagram-asset?url=${encodeURIComponent(url.replace(AMP_RE, '&'))}`
}

export function rewriteUrl(url: string, prefix = '/_scripts'): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === INSTAGRAM_ASSET_HOST)
      return proxyAssetUrl(url, prefix)
    if (INSTAGRAM_IMAGE_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.cdninstagram.com`)))
      return proxyImageUrl(url, prefix)
  }
  catch {}
  return url
}

export function rewriteUrlsInText(text: string, prefix = '/_scripts'): string {
  return text
    .replace(SCONTENT_RE, m => proxyImageUrl(m, prefix))
    .replace(STATIC_CDN_RE, m => proxyAssetUrl(m, prefix))
    .replace(LOOKASIDE_RE, m => proxyImageUrl(m, prefix))
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
