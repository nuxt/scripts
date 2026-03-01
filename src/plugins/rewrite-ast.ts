import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'
import { parseURL, joinURL } from 'ufo'
import type { ProxyRewrite } from '../runtime/utils/pure'

/**
 * Check if a string literal node is in a "key" position (object property key or switch-case test).
 * In these positions we must not inject `self.location.origin+` expressions.
 */
function isPropertyKeyAST(parent: any, ctx: { key: string | number | symbol | null | undefined }): boolean {
  return (parent?.type === 'Property' && ctx.key === 'key')
    || (parent?.type === 'SwitchCase' && ctx.key === 'test')
}

/**
 * Try to match a string value against a proxy rewrite rule.
 * Returns the rewritten path if matched, or `null` if no match.
 */
function matchAndRewrite(value: string, rewrites: ProxyRewrite[]): string | null {
  for (const { from, to } of rewrites) {
    const isSuffixMatch = from.startsWith('.')
    const fromSlashIdx = from.indexOf('/')
    const fromHost = fromSlashIdx > 0 ? from.slice(0, fromSlashIdx) : from
    const fromPath = fromSlashIdx > 0 ? from.slice(fromSlashIdx) : ''

    if (!value.includes(fromHost)) continue

    const url = parseURL(value)
    let shouldRewrite = false
    let rewriteSuffix = ''

    if (url.host) {
      const hostMatches = isSuffixMatch ? url.host.endsWith(fromHost) : url.host === fromHost
      if (hostMatches) {
        const fullPath = url.pathname + (url.search || '') + (url.hash || '')
        if (fromPath && fullPath.startsWith(fromPath)) {
          shouldRewrite = true
          rewriteSuffix = fullPath.slice(fromPath.length)
        }
        else if (!fromPath) {
          shouldRewrite = true
          rewriteSuffix = fullPath
        }
      }
    }
    else if (value.startsWith('//')) {
      const hostPart = value.slice(2).split('/')[0]
      const hostMatches = isSuffixMatch
        ? hostPart?.endsWith(fromHost) ?? false
        : hostPart === fromHost
      if (hostMatches) {
        const remainder = value.slice(2 + (hostPart?.length ?? 0))
        if (fromPath && remainder.startsWith(fromPath)) {
          shouldRewrite = true
          rewriteSuffix = remainder.slice(fromPath.length)
        }
        else if (!fromPath) {
          shouldRewrite = true
          rewriteSuffix = remainder
        }
      }
    }
    else if (fromPath && (value.startsWith(from) || (isSuffixMatch && value.includes(from)))) {
      const domainEnd = value.indexOf(from) + from.length
      const nextChar = value[domainEnd]
      if (!nextChar || nextChar === '/' || nextChar === '?' || nextChar === '#') {
        shouldRewrite = true
        rewriteSuffix = value.slice(domainEnd)
      }
    }

    if (shouldRewrite) {
      return rewriteSuffix === '/' || rewriteSuffix.startsWith('?') || rewriteSuffix.startsWith('#')
        ? to + rewriteSuffix
        : joinURL(to, rewriteSuffix)
    }
  }
  return null
}

/**
 * AST-based URL rewriting for downloaded scripts at build time.
 * Uses oxc-walker to precisely identify string literals and their context,
 * avoiding false matches inside comments/regexes and heuristic-based key detection.
 *
 */
export function rewriteScriptUrlsAST(content: string, filename: string, rewrites: ProxyRewrite[]): string {
  const s = new MagicString(content)

  parseAndWalk(content, filename, function (node, parent, ctx) {
    // String literals
    if (node.type === 'Literal' && typeof (node as any).value === 'string') {
      const value = (node as any).value as string
      const rewritten = matchAndRewrite(value, rewrites)
      if (rewritten === null) return

      const quote = content[node.start] // preserve original quote character
      if (isPropertyKeyAST(parent, ctx)) {
        s.overwrite(node.start, node.end, quote + rewritten + quote)
      }
      else {
        s.overwrite(node.start, node.end, 'self.location.origin+' + quote + rewritten + quote)
      }
    }

    // Template literals with no expressions (static strings)
    if (node.type === 'TemplateLiteral' && (node as any).expressions?.length === 0) {
      const quasis = (node as any).quasis
      if (quasis?.length === 1) {
        const value = quasis[0].value?.cooked ?? quasis[0].value?.raw
        if (typeof value !== 'string') return
        const rewritten = matchAndRewrite(value, rewrites)
        if (rewritten === null) return

        if (isPropertyKeyAST(parent, ctx)) {
          s.overwrite(node.start, node.end, '`' + rewritten + '`')
        }
        else {
          s.overwrite(node.start, node.end, 'self.location.origin+`' + rewritten + '`')
        }
      }
    }

    // API call rewriting: navigator.sendBeacon → __nuxtScripts.sendBeacon
    if (node.type === 'CallExpression') {
      const callee = (node as any).callee
      if (callee?.type === 'MemberExpression' && !callee.computed
        && callee.object?.type === 'Identifier'
        && callee.object.name === 'navigator'
        && callee.property?.name === 'sendBeacon') {
        s.overwrite(callee.start, callee.end, '__nuxtScripts.sendBeacon')
      }

      // fetch(url, ...) → __nuxtScripts.fetch(url, ...)
      if (callee?.type === 'Identifier' && callee.name === 'fetch') {
        s.overwrite(callee.start, callee.end, '__nuxtScripts.fetch')
      }

      // window.fetch / self.fetch / globalThis.fetch → __nuxtScripts.fetch
      if (callee?.type === 'MemberExpression' && !callee.computed
        && callee.object?.type === 'Identifier'
        && (callee.object.name === 'window' || callee.object.name === 'self' || callee.object.name === 'globalThis')
        && callee.property?.name === 'fetch') {
        s.overwrite(callee.start, callee.end, '__nuxtScripts.fetch')
      }
    }
  })

  // GA dynamic URL construction pattern — keep as regex post-pass
  let output = s.toString()
  const gaRewrite = rewrites.find(r => r.from.includes('google-analytics.com/g/collect'))
  if (gaRewrite) {
    output = output.replace(
      /"https:\/\/"\+\(.*?\)\+"\.google-analytics\.com\/g\/collect"/g,
      `self.location.origin+"${gaRewrite.to}"`,
    )
    output = output.replace(
      /"https:\/\/"\+\(.*?\)\+"\.analytics\.google\.com\/g\/collect"/g,
      `self.location.origin+"${gaRewrite.to}"`,
    )
  }

  return output
}
