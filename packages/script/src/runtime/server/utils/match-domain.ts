/**
 * Match a hostname against an allowlist pattern.
 * Patterns may include `*` as a wildcard that matches one or more characters
 * (excluding `/`); e.g. `www.google.*` matches `www.google.com`,
 * `www.google.com.tw`, `www.google.co.jp`. Bare patterns also match
 * subdomains, e.g. `google.com` matches `mail.google.com`.
 */
export function matchDomain(domain: string, pattern: string): boolean {
  if (!pattern.includes('*'))
    return domain === pattern || domain.endsWith(`.${pattern}`)

  // Walk literal segments split on `*`. This avoids constructing a regex from
  // a free-form string (and the static-analysis warnings that follow). Each
  // `*` requires at least one matched character that is not `/`.
  if (domain.includes('/'))
    return false
  const segments = pattern.split('*')
  const lastIndex = segments.length - 1
  let cursor = 0
  for (let i = 0; i <= lastIndex; i++) {
    const segment = segments[i] ?? ''
    if (i === 0) {
      if (!domain.startsWith(segment))
        return false
      cursor = segment.length
      continue
    }
    if (i === lastIndex) {
      if (!domain.endsWith(segment))
        return false
      const wildcardEnd = domain.length - segment.length
      return wildcardEnd > cursor
    }
    const nextIdx = domain.indexOf(segment, cursor + 1)
    if (nextIdx === -1)
      return false
    cursor = nextIdx + segment.length
  }
  // Lone `*` pattern: any non-empty domain (already excluded `/` above).
  return domain.length > 0
}
