import { parseURL, joinURL } from 'ufo'

/**
 * Proxy configuration for third-party scripts.
 */
export interface ProxyRewrite {
  /** Domain and path to match (e.g., 'www.google-analytics.com/g/collect') */
  from: string
  /** Local path to rewrite to (e.g., '/_scripts/c/ga/g/collect') */
  to: string
}

/**
 * Rewrite URLs in script content based on proxy config.
 */
export function rewriteScriptUrls(content: string, rewrites: ProxyRewrite[]): string {
  let result = content

  // Simple regex to find string literals in JavaScript
  const literalRegex = /(['"`])(.*?)\1/g

  for (const { from, to } of rewrites) {
    const isSuffixMatch = from.startsWith('.')

    // Parse 'from' to separate host and path parts (e.g., 'www.google.com/g/collect')
    const fromSlashIdx = from.indexOf('/')
    const fromHost = fromSlashIdx > 0 ? from.slice(0, fromSlashIdx) : from
    const fromPath = fromSlashIdx > 0 ? from.slice(fromSlashIdx) : ''

    result = result.replace(literalRegex, (match, quote, inner) => {
      // Optimization: skip if it doesn't even contain the 'from' domain
      if (!inner.includes(fromHost)) return match

      // Attempt to parse as URL
      const url = parseURL(inner)

      // Determine if we should rewrite this string
      let shouldRewrite = false
      let rewriteSuffix = ''

      if (url.host) {
        // Full URL with host
        const hostMatches = isSuffixMatch
          ? url.host.endsWith(fromHost)
          : url.host === fromHost

        if (hostMatches) {
          const fullPath = url.pathname + (url.search || '') + (url.hash || '')
          if (fromPath && fullPath.startsWith(fromPath)) {
            // Host+path match: strip the fromPath prefix from the suffix
            shouldRewrite = true
            rewriteSuffix = fullPath.slice(fromPath.length)
          }
          else if (!fromPath) {
            // Host-only match
            shouldRewrite = true
            rewriteSuffix = fullPath
          }
        }
      }
      else if (inner.startsWith('//')) {
        // Protocol-relative URL
        const hostPart = inner.slice(2).split('/')[0]
        const hostMatches = isSuffixMatch
          ? hostPart?.endsWith(fromHost) ?? false
          : hostPart === fromHost

        if (hostMatches) {
          const remainder = inner.slice(2 + (hostPart?.length ?? 0))
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
      else if ((fromPath && inner.startsWith(from)) || (isSuffixMatch && inner.includes(from))) {
        // Bare domain path or partial match
        const domainEnd = inner.indexOf(from) + from.length
        const nextChar = inner[domainEnd]
        if (!nextChar || nextChar === '/' || nextChar === '?' || nextChar === '#') {
          shouldRewrite = true
          rewriteSuffix = inner.slice(domainEnd)
        }
      }

      if (shouldRewrite) {
        // If suffix starts with ? or # (query/hash only), concatenate directly
        // joinURL would incorrectly add a / before the query string
        const rewritten = rewriteSuffix === '/' || rewriteSuffix.startsWith('?') || rewriteSuffix.startsWith('#')
          ? to + rewriteSuffix
          : joinURL(to, rewriteSuffix)
        return quote + rewritten + quote
      }

      return match
    })
  }

  // Handle GA's specific dynamic URL construction patterns as a fallback
  const gaRewrite = rewrites.find(r => r.from.includes('google-analytics.com/g/collect'))
  if (gaRewrite) {
    result = result.replace(
      /"https:\/\/"\+\(.*?\)\+"\.google-analytics\.com\/g\/collect"/g,
      `"${gaRewrite.to}"`,
    )
    result = result.replace(
      /"https:\/\/"\+\(.*?\)\+"\.analytics\.google\.com\/g\/collect"/g,
      `"${gaRewrite.to}"`,
    )
  }

  return result
}
