/**
 * Match a hostname against an allowlist pattern.
 *
 * Two wildcard shapes are supported:
 *
 * 1. Trailing TLD wildcard `host.<tld>.*` — matches a top-level domain suffix
 *    shaped like a real ccTLD or gTLD:
 *      - `com` (the canonical gTLD we care about)
 *      - any 2-letter ccTLD (`tw`, `jp`, `de`, ...)
 *      - regional `com.<cc>` or `co.<cc>` (e.g. `com.tw`, `co.jp`, `com.hk`)
 *
 *    Used for geo-localized Google ccTLDs:
 *      `www.google.*` matches `www.google.com`, `www.google.com.tw`, `www.google.co.jp`.
 *
 *    The pattern is intentionally narrow: it rejects attacker-controlled
 *    suffixes like `www.google.foo.bar` (two arbitrary 3-letter labels) or
 *    `www.google.attacker.com` (long second-level label).
 *
 * 2. Leading subdomain wildcard `*.host.tld` — matches exactly one DNS label
 *    in front of the suffix. The wildcard label must be one or more non-dot
 *    chars; it does not match the bare suffix or multi-label prefixes.
 *
 *    Used for vendors that bucket clients across letter/hash-prefixed shards:
 *      `*.clarity.ms` matches `a.clarity.ms`, `www.clarity.ms`, `scripts.clarity.ms`.
 *      It does NOT match `clarity.ms` (no prefix) or `a.b.clarity.ms` (multi-label).
 *
 * Bare patterns also match subdomains, e.g. `google.com` matches `mail.google.com`.
 */
const TLD_WILDCARD_RE = /^(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/i
const SUBDOMAIN_LABEL_RE = /^[^.]+$/

export function matchDomain(domain: string, pattern: string): boolean {
  if (!pattern.includes('*'))
    return domain === pattern || domain.endsWith(`.${pattern}`)

  // Leading subdomain wildcard: `*.host.tld` matches exactly one non-dot label.
  if (pattern.startsWith('*.') && pattern.indexOf('*') === 0) {
    const suffix = pattern.slice(2) // drop leading "*."
    if (!domain.endsWith(`.${suffix}`))
      return false
    const label = domain.slice(0, -(suffix.length + 1))
    return SUBDOMAIN_LABEL_RE.test(label)
  }

  // Trailing TLD wildcard: only support a single trailing `*`. Any other
  // wildcard shape is rejected rather than silently allowed.
  if (!pattern.endsWith('*') || pattern.indexOf('*') !== pattern.length - 1)
    return false

  const prefix = pattern.slice(0, -1) // includes trailing dot, e.g. "www.google."
  if (!domain.startsWith(prefix))
    return false

  const tld = domain.slice(prefix.length)
  return TLD_WILDCARD_RE.test(tld)
}
