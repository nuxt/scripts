/**
 * Match a hostname against an allowlist pattern.
 *
 * Patterns may include `*` as a TLD wildcard that matches a top-level domain
 * suffix shaped like a real ccTLD or gTLD:
 *   - `com` (the canonical gTLD we care about)
 *   - any 2-letter ccTLD (`tw`, `jp`, `de`, ...)
 *   - regional `com.<cc>` or `co.<cc>` (e.g. `com.tw`, `co.jp`, `com.hk`)
 *
 * Used for geo-localized Google ccTLDs:
 *   `www.google.*` matches `www.google.com`, `www.google.com.tw`, `www.google.co.jp`.
 *
 * The pattern is intentionally narrow: it rejects attacker-controlled suffixes
 * like `www.google.foo.bar` (two arbitrary 3-letter labels) or
 * `www.google.attacker.com` (long second-level label).
 *
 * Bare patterns also match subdomains, e.g. `google.com` matches `mail.google.com`.
 */
const TLD_WILDCARD_RE = /^(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/i

export function matchDomain(domain: string, pattern: string): boolean {
  if (!pattern.includes('*'))
    return domain === pattern || domain.endsWith(`.${pattern}`)

  // Only support a trailing single `*` wildcard for TLD matching (the only
  // shape we use in practice). Reject any other pattern shape rather than
  // silently allowing it.
  if (!pattern.endsWith('*') || pattern.indexOf('*') !== pattern.length - 1)
    return false

  const prefix = pattern.slice(0, -1) // includes trailing dot, e.g. "www.google."
  if (!domain.startsWith(prefix))
    return false

  const tld = domain.slice(prefix.length)
  return TLD_WILDCARD_RE.test(tld)
}
