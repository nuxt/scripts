import type { ProxyRewrite, SdkPatch } from '../runtime/types'
import MagicString from 'magic-string'
import { parseAndWalk, ScopeTracker, ScopeTrackerFunction, ScopeTrackerFunctionParam, ScopeTrackerIdentifier, ScopeTrackerVariable, walk } from 'oxc-walker'
import { joinURL, parseURL } from 'ufo'

const WORD_OR_DOLLAR_RE = /[\w$]/
const PROTOCOL_PREFIX_RE = /^https?:$/
// Static blank 1x1 transparent PNG — every user gets the same value, defeating canvas fingerprinting
// while returning a valid data URL that won't break scripts checking format/truthiness.
const BLANK_CANVAS_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWNgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12NgYGBgAAAABQABXvMqOgAAAABJRU5ErkJggg=='

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

      // var n = w.navigator / var n = w['navigator'] → resolve w, then append property
      if (init.type === 'MemberExpression' && init.object?.type === 'Identifier') {
        const memberProp = init.computed
          ? (init.property?.type === 'Literal' && typeof init.property.value === 'string' ? init.property.value : null)
          : init.property?.type === 'Identifier' ? init.property.name : null
        if (!memberProp)
          return null
        const objGlobal = resolveToGlobal(init.object.name, scopeTracker, depth + 1)
        if (!objGlobal)
          return null
        // window.navigator → "navigator", window.fetch stays as compound
        if (WINDOW_GLOBALS.has(objGlobal) || objGlobal === 'document')
          return memberProp
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
export function rewriteScriptUrlsAST(content: string, filename: string, rewrites: ProxyRewrite[], sdkPatches?: SdkPatch[], options?: { skipApiRewrites?: boolean, neutralizeCanvas?: boolean }): string {
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
        else if (value.startsWith('//') && parent?.type === 'BinaryExpression' && parent.operator === '+') {
          // Handle split protocol+URL patterns like "https:" + "//k.clarity.ms/collect"
          // Without this, the rewrite would produce "https:" + self.location.origin+"/_proxy/..."
          // which creates a malformed "https:http://localhost:3001/..." URL
          const sibling = ctx.key === 'right' ? parent.left : parent.right
          if (sibling?.type === 'Literal' && typeof sibling.value === 'string' && PROTOCOL_PREFIX_RE.test(sibling.value)) {
            s.overwrite(parent.start, parent.end, `${needsLeadingSpace(parent.start)}self.location.origin+${quote}${rewritten}${quote}`)
          }
          else {
            s.overwrite(node.start, node.end, `${needsLeadingSpace(node.start)}self.location.origin+${quote}${rewritten}${quote}`)
          }
        }
        else {
          s.overwrite(node.start, node.end, `${needsLeadingSpace(node.start)}self.location.origin+${quote}${rewritten}${quote}`)
        }
      }

      // Template literals — static (no expressions) and dynamic (with expressions)
      if (node.type === 'TemplateLiteral') {
        const quasis = (node as any).quasis
        const expressions = (node as any).expressions

        if (expressions?.length === 0 && quasis?.length === 1) {
          // Static template literal — rewrite the whole thing
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
        else if (expressions?.length > 0 && quasis?.length > 0) {
          // Template literal with expressions — check if first quasi contains a URL to rewrite.
          // e.g. `https://analytics.tiktok.com/api?id=${id}` → self.location.origin+`/_proxy/tiktok/api?id=${id}`
          const firstQuasi = quasis[0]
          const value = firstQuasi.value?.cooked ?? firstQuasi.value?.raw
          if (typeof value !== 'string' || isPropertyKeyAST(parent, ctx))
            return
          const rewritten = matchAndRewrite(value, rewrites)
          if (rewritten === null)
            return

          // Overwrite just the first quasi and prepend self.location.origin+
          // Template: `{quasi0}${expr0}{quasi1}...`
          // We rewrite quasi0 content and add prefix before the opening backtick
          s.overwrite(node.start, firstQuasi.end, `${needsLeadingSpace(node.start)}self.location.origin+\`${rewritten}`)
        }
      }

      // API call rewriting — skip for partytown scripts (they use resolveUrl instead)
      if (node.type === 'CallExpression' && !options?.skipApiRewrites) {
        const callee = (node as any).callee

        // Canvas fingerprinting neutralization — gated on hardware privacy flag.
        // Only scripts with hardware anonymization enabled get canvas neutralized.
        // Scripts without hardware anonymization skip this since they don't
        // canvas fingerprint and may use canvas APIs legitimately.
        const shouldNeutralizeCanvas = options?.neutralizeCanvas !== false
        const canvasPropName = shouldNeutralizeCanvas && callee?.type === 'MemberExpression'
          ? (callee.computed
              ? (callee.property?.type === 'Literal' && typeof callee.property.value === 'string' ? callee.property.value : null)
              : callee.property?.name)
          : null

        // .toDataURL() → static blank canvas (prevents canvas fingerprint extraction)
        if (canvasPropName === 'toDataURL' && callee.object) {
          const blankCanvas = `"${BLANK_CANVAS_DATA_URL}"`
          // Skip if the object resolves to a locally declared function/class (not a DOM element)
          if (callee.object.type === 'Identifier') {
            const decl = scopeTracker.getDeclaration(callee.object.name)
            // If declared as a function or class, it's not a canvas element — skip
            if (decl instanceof ScopeTrackerFunction || decl instanceof ScopeTrackerIdentifier) {
              // fall through to other checks
              ;
            }
            else {
              s.overwrite(node.start, node.end, blankCanvas)
              return
            }
          }
          else {
            // Chained access (e.g. ctx.canvas.toDataURL()) — always neutralize
            s.overwrite(node.start, node.end, blankCanvas)
            return
          }
        }
        // .getExtension('WEBGL_debug_renderer_info') → null (prevents GPU fingerprinting)
        if (canvasPropName === 'getExtension') {
          const args = (node as any).arguments
          if (args?.length === 1 && args[0]?.type === 'Literal' && args[0].value === 'WEBGL_debug_renderer_info') {
            s.overwrite(node.start, node.end, 'null')
            return
          }
        }

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

      // SDK patch: neutralize-domain-check
      // Matches `.indexOf("...domain...") < 0` and rewrites `< 0` to `< -1`
      if (sdkPatches?.some(p => p.type === 'neutralize-domain-check')
        && node.type === 'BinaryExpression'
        && (node as any).operator === '<') {
        const left = (node as any).left
        const right = (node as any).right
        if (right?.type === 'Literal' && right.value === 0
          && left?.type === 'CallExpression'
          && left.callee?.type === 'MemberExpression') {
          const prop = left.callee.computed
            ? (left.callee.property?.type === 'Literal' && typeof left.callee.property.value === 'string' ? left.callee.property.value : null)
            : left.callee.property?.name
          if (prop === 'indexOf' && left.arguments?.length === 1) {
            const arg = left.arguments[0]
            if (arg?.type === 'Literal' && typeof arg.value === 'string'
              && rewrites.some(r => arg.value.includes(r.from))) {
              s.overwrite(right.start, right.end, '-1')
            }
          }
        }
      }

      // SDK patch: replace-src-split
      // Matches `<expr>.split("<separator>")[0]` and replaces with proxy path
      if (sdkPatches?.some(p => p.type === 'replace-src-split')
        && node.type === 'MemberExpression'
        && (node as any).computed) {
        const prop = (node as any).property
        const obj = (node as any).object
        if (prop?.type === 'Literal' && prop.value === 0
          && obj?.type === 'CallExpression'
          && obj.callee?.type === 'MemberExpression') {
          const callProp = obj.callee.computed
            ? (obj.callee.property?.type === 'Literal' && typeof obj.callee.property.value === 'string' ? obj.callee.property.value : null)
            : obj.callee.property?.name
          if (callProp === 'split' && obj.arguments?.length === 1) {
            const arg = obj.arguments[0]
            if (arg?.type === 'Literal' && typeof arg.value === 'string') {
              for (const patch of sdkPatches) {
                if (patch.type !== 'replace-src-split' || patch.separator !== arg.value)
                  continue
                const rewrite = rewrites.find(r => r.from === patch.fromDomain)
                if (!rewrite)
                  continue
                const proxyPath = patch.appendPath ? `${rewrite.to}/${patch.appendPath}` : rewrite.to
                s.overwrite(node.start, node.end, `${needsLeadingSpace(node.start)}self.location.origin+"${proxyPath}"`)
              }
            }
          }
        }
      }

      // new XMLHttpRequest / new Image / new x.XMLHttpRequest / new x.Image
      if (node.type === 'NewExpression' && !options?.skipApiRewrites) {
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

  return s.toString()
}
