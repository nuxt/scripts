const REGEX_ESCAPE_RE = /[.+?^${}()|[\]\\]/g

/**
 * Match a hostname against an allowlist pattern.
 * Patterns may include `*` to match one or more non-dot characters; e.g. `www.google.*`
 * matches `www.google.com`, `www.google.com.tw`, `www.google.co.jp`. Bare patterns also
 * match subdomains, e.g. `google.com` matches `mail.google.com`.
 */
export function matchDomain(domain: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    const re = new RegExp(`^${pattern.replace(REGEX_ESCAPE_RE, '\\$&').replace(/\*/g, '[^/]+')}$`)
    return re.test(domain)
  }
  return domain === pattern || domain.endsWith(`.${pattern}`)
}
