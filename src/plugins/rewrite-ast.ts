import type { ProxyRewrite } from '../runtime/utils/pure'
import MagicString from 'magic-string'
import { parseAndWalk, ScopeTracker, ScopeTrackerFunctionParam, ScopeTrackerVariable, walk } from 'oxc-walker'
import { joinURL, parseURL } from 'ufo'

const WORD_OR_DOLLAR_RE = /[\w$]/
const GA_COLLECT_RE = /([\w$])?"https:\/\/"\+\(.*?\)\+"\.google-analytics\.com\/g\/collect"/g
const GA_ANALYTICS_COLLECT_RE = /([\w$])?"https:\/\/"\+\(.*?\)\+"\.analytics\.google\.com\/g\/collect"/g
const FATHOM_SELF_HOSTED_RE = /\.src\.indexOf\("cdn\.usefathom\.com"\)\s*<\s*0/

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

    if (!value.includes(fromHost))
      continue

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

const WINDOW_GLOBALS = new Set(['window', 'self', 'globalThis'])
const NAVIGATOR_GLOBALS = new Set(['navigator'])

/**
 * Resolve an identifier name to its global origin through alias chains.
 * Returns the global name (e.g., "window", "navigator") or null if unresolvable.
 */
function resolveToGlobal(name: string, scopeTracker: ScopeTracker, depth = 0): string | null {
  if (depth > 10)
    return null

  const decl = scopeTracker.getDeclaration(name)
  // Not declared in any scope → it's a global
  if (!decl)
    return name

  // Function parameter → can't resolve statically
  if (decl instanceof ScopeTrackerFunctionParam)
    return null

  // Variable declaration → inspect init expression
  if (decl instanceof ScopeTrackerVariable) {
    const declarators = (decl.variableNode as any).declarations
    if (!declarators)
      return null

    for (const declarator of declarators) {
      const id = declarator.id
      if (!id || id.name !== name)
        continue

      const init = declarator.init
      if (!init)
        return null

      // var w = window → recurse on "window"
      if (init.type === 'Identifier')
        return resolveToGlobal(init.name, scopeTracker, depth + 1)

      // var n = w.navigator → resolve w, then append .navigator
      if (init.type === 'MemberExpression' && !init.computed && init.object?.type === 'Identifier' && init.property?.type === 'Identifier') {
        const objGlobal = resolveToGlobal(init.object.name, scopeTracker, depth + 1)
        if (!objGlobal)
          return null
        // window.navigator → "navigator", window.fetch stays as compound
        if (WINDOW_GLOBALS.has(objGlobal) || objGlobal === 'document')
          return init.property.name
        return null
      }

      return null
    }
  }

  return null
}

/**
 * For a MemberExpression callee, resolve the object to determine the __nuxtScripts target.
 * Returns the target property name (e.g., "fetch", "sendBeacon") or null.
 */
function resolveCalleeTarget(callee: any, scopeTracker: ScopeTracker): string | null {
  if (callee?.type !== 'MemberExpression')
    return null

  const propName = callee.computed
    ? (callee.property?.type === 'Literal' && typeof callee.property.value === 'string' ? callee.property.value : null)
    : callee.property?.name

  if (!propName)
    return null

  const obj = callee.object
  if (!obj || obj.type !== 'Identifier')
    return null

  const resolved = resolveToGlobal(obj.name, scopeTracker)
  if (!resolved)
    return null

  // fetch on window-like globals
  if (propName === 'fetch' && WINDOW_GLOBALS.has(resolved))
    return 'fetch'

  // sendBeacon on navigator
  if (propName === 'sendBeacon' && (NAVIGATOR_GLOBALS.has(resolved) || WINDOW_GLOBALS.has(resolved)))
    return 'sendBeacon'

  // For window.navigator.sendBeacon → resolved would be "navigator" already
  if (propName === 'sendBeacon' && resolved === 'navigator')
    return 'sendBeacon'

  // XMLHttpRequest/Image on window-like globals
  if (propName === 'XMLHttpRequest' && WINDOW_GLOBALS.has(resolved))
    return 'XMLHttpRequest'
  if (propName === 'Image' && WINDOW_GLOBALS.has(resolved))
    return 'Image'

  return null
}

/**
 * AST-based URL rewriting for downloaded scripts at build time.
 * Uses oxc-walker with ScopeTracker to precisely identify string literals,
 * resolve aliased globals, and rewrite API calls through the proxy.
 */
export function rewriteScriptUrlsAST(content: string, filename: string, rewrites: ProxyRewrite[]): string {
  const s = new MagicString(content)

  // In minified JS, keywords like `return` can directly precede string literals
  // (e.g. `return"url"`). When we replace the string with an expression like
  // `self.location.origin+"..."`, we must avoid creating `returnself` which
  // would be parsed as a single identifier instead of `return self`.
  function needsLeadingSpace(start: number): string {
    const prev = content[start - 1]
    return prev && WORD_OR_DOLLAR_RE.test(prev) ? ' ' : ''
  }

  // Pass 1: collect all declarations
  const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
  const { program } = parseAndWalk(content, filename, { scopeTracker })
  scopeTracker.freeze()

  // Pass 2: rewrite with scope resolution
  walk(program, {
    scopeTracker,
    enter(node, parent, ctx) {
      // String literals
      if (node.type === 'Literal' && typeof (node as any).value === 'string') {
        const value = (node as any).value as string
        const rewritten = matchAndRewrite(value, rewrites)
        if (rewritten === null)
          return

        const quote = content[node.start] // preserve original quote character
        if (isPropertyKeyAST(parent, ctx)) {
          s.overwrite(node.start, node.end, quote + rewritten + quote)
        }
        else {
          s.overwrite(node.start, node.end, `${needsLeadingSpace(node.start)}self.location.origin+${quote}${rewritten}${quote}`)
        }
      }

      // Template literals with no expressions (static strings)
      if (node.type === 'TemplateLiteral' && (node as any).expressions?.length === 0) {
        const quasis = (node as any).quasis
        if (quasis?.length === 1) {
          const value = quasis[0].value?.cooked ?? quasis[0].value?.raw
          if (typeof value !== 'string')
            return
          const rewritten = matchAndRewrite(value, rewrites)
          if (rewritten === null)
            return

          if (isPropertyKeyAST(parent, ctx)) {
            s.overwrite(node.start, node.end, `\`${rewritten}\``)
          }
          else {
            s.overwrite(node.start, node.end, `${needsLeadingSpace(node.start)}self.location.origin+\`${rewritten}\``)
          }
        }
      }

      // API call rewriting
      if (node.type === 'CallExpression') {
        const callee = (node as any).callee

        // fetch(url) → check it's truly global (not locally declared)
        if (callee?.type === 'Identifier' && callee.name === 'fetch') {
          if (!scopeTracker.getDeclaration('fetch'))
            s.overwrite(callee.start, callee.end, '__nuxtScripts.fetch')
          return
        }

        // MemberExpression callees: x.fetch(), x.sendBeacon(), etc.
        const target = resolveCalleeTarget(callee, scopeTracker)
        if (target === 'fetch' || target === 'sendBeacon') {
          s.overwrite(callee.start, callee.end, `__nuxtScripts.${target}`)
          return
        }

        // Heuristic: <unresolvable>.sendBeacon() — sendBeacon is unique to navigator
        if (callee?.type === 'MemberExpression' && !callee.computed
          && callee.property?.name === 'sendBeacon'
          && callee.object?.type === 'Identifier') {
          const resolved = resolveToGlobal(callee.object.name, scopeTracker)
          // null means unresolvable (e.g. function param) — apply heuristic
          if (resolved === null) {
            s.overwrite(callee.start, callee.end, '__nuxtScripts.sendBeacon')
          }
        }
      }

      // new XMLHttpRequest / new Image / new x.XMLHttpRequest / new x.Image
      if (node.type === 'NewExpression') {
        const callee = (node as any).callee

        // new XMLHttpRequest — check it's truly global
        if (callee?.type === 'Identifier' && callee.name === 'XMLHttpRequest') {
          if (!scopeTracker.getDeclaration('XMLHttpRequest'))
            s.overwrite(callee.start, callee.end, '__nuxtScripts.XMLHttpRequest')
          return
        }

        // new Image — check it's truly global
        if (callee?.type === 'Identifier' && callee.name === 'Image') {
          if (!scopeTracker.getDeclaration('Image'))
            s.overwrite(callee.start, callee.end, '__nuxtScripts.Image')
          return
        }

        // new x.XMLHttpRequest / new x.Image / new x["XMLHttpRequest"]
        const target = resolveCalleeTarget(callee, scopeTracker)
        if (target === 'XMLHttpRequest' || target === 'Image') {
          s.overwrite(callee.start, callee.end, `__nuxtScripts.${target}`)
          return
        }

        // Heuristic: new <unresolvable>.XMLHttpRequest / new <unresolvable>.Image
        if (callee?.type === 'MemberExpression' && callee.object?.type === 'Identifier') {
          const propName = callee.computed
            ? (callee.property?.type === 'Literal' && typeof callee.property.value === 'string' ? callee.property.value : null)
            : callee.property?.name
          if (propName === 'XMLHttpRequest' || propName === 'Image') {
            const resolved = resolveToGlobal(callee.object.name, scopeTracker)
            if (resolved === null) {
              s.overwrite(callee.start, callee.end, `__nuxtScripts.${propName}`)
            }
          }
        }
      }
    },
  })

  // GA dynamic URL construction pattern — keep as regex post-pass
  let output = s.toString()
  const gaRewrite = rewrites.find(r => r.from.includes('google-analytics.com/g/collect'))
  if (gaRewrite) {
    output = output.replace(
      GA_COLLECT_RE,
      (_, prevChar) => `${prevChar ? `${prevChar} ` : ''}self.location.origin+"${gaRewrite.to}"`,
    )
    output = output.replace(
      GA_ANALYTICS_COLLECT_RE,
      (_, prevChar) => `${prevChar ? `${prevChar} ` : ''}self.location.origin+"${gaRewrite.to}"`,
    )
  }

  // Fathom self-hosted detection: the SDK checks if its src contains
  // "cdn.usefathom.com" and overrides trackerUrl with the script host's root.
  // After AST rewrite already set trackerUrl to the correct proxy URL,
  // neutralize this check so it doesn't override it.
  if (rewrites.some(r => r.from === 'cdn.usefathom.com')) {
    output = output.replace(
      FATHOM_SELF_HOSTED_RE,
      '.src.indexOf("cdn.usefathom.com")<-1',
    )
  }

  return output
}
