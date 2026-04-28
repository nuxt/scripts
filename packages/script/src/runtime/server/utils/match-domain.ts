/**
 * Match a hostname against an allowlist pattern.
 *
 * Patterns may include `*` as a TLD wildcard that matches a top-level domain
 * suffix shaped like a ccTLD: either a single 2-3 letter label (`com`, `tw`,
 * `jp`, `de`) or two such labels separated by a dot (`co.jp`, `com.tw`,
 * `com.hk`). Used for geo-localized Google ccTLDs:
 *   `www.google.*` matches `www.google.com`, `www.google.com.tw`, `www.google.co.jp`.
 *
 * Crucially, the wildcard does NOT match arbitrary attacker-controlled
 * subdomains: `www.google.attacker.com` is rejected because `attacker` is
 * longer than 3 characters (the cap that excludes generic SLDs like
 * `attacker`, `evil-domain`, etc).
 *
 * Bare patterns also match subdomains, e.g. `google.com` matches `mail.google.com`.
 */
const TLD_WILDCARD_RE = /^[a-z]{2,3}(?:\.[a-z]{2,3})?$/i

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
