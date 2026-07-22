import { createHash } from 'node:crypto'

/**
 * Proxy path alias configuration.
 * - `false` / `undefined`: proxy paths use the verbatim third-party hostname
 *   (`/_scripts/p/us.i.posthog.com/...`).
 * - `true`: every proxied domain gets a short deterministic opaque alias
 *   (`/_scripts/p/a1b2c3d4/...`), so the real hostname never appears in client URLs.
 * - `Record<domain, alias>`: explicit aliases (domain → alias). Domains not listed
 *   keep their verbatim hostname.
 */
export type ProxyAliasConfig = boolean | Record<string, string> | undefined

const WILDCARD_RE = /\*/
// An alias is interpolated into `/_scripts/p/<alias>/...`, so it must be a single
// URL path segment: no slash/query/hash/whitespace that would split or break the path.
const SAFE_ALIAS_SEGMENT_RE = /^[\w.-]+$/

/** Whether an explicit alias is a single URL-safe path segment. */
export function isSafeAliasSegment(alias: string): boolean {
  return alias !== '.' && alias !== '..' && SAFE_ALIAS_SEGMENT_RE.test(alias)
}

/**
 * Resolve the alias for a single third-party domain. Pure and deterministic so the
 * build-time rewrites and the runtime reverse map always agree without sharing state.
 *
 * Returns `undefined` when the domain should keep its verbatim hostname (no alias
 * configured, or a wildcard pattern that has no literal path form to rewrite).
 */
export function aliasForDomain(domain: string, alias: ProxyAliasConfig): string | undefined {
  if (!alias || WILDCARD_RE.test(domain))
    return undefined
  if (alias === true)
    // 12 hex chars (48 bits) — collision space large enough that auto-aliasing never
    // silently misroutes; explicit-alias collisions are caught at build time instead.
    return createHash('sha256').update(domain).digest('hex').slice(0, 12)
  // Own-property guard so a domain literally named `toString`/`constructor` can't
  // resolve to an inherited prototype member.
  return Object.hasOwn(alias, domain) ? (alias[domain] || undefined) : undefined
}

/** Build a `domain → alias` map for the given proxied domains. */
export function buildDomainAliasMap(domains: Iterable<string>, alias: ProxyAliasConfig): Record<string, string> {
  const entries: Array<[string, string]> = []
  for (const domain of domains) {
    const value = aliasForDomain(domain, alias)
    if (value)
      entries.push([domain, value])
  }
  return Object.fromEntries(entries)
}

/** Invert a `domain → alias` map into the `alias → domain` map the proxy handler resolves with. */
export function invertAliasMap(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([domain, alias]) => [alias, domain]))
}

/**
 * Rewrite the leading `${proxyPrefix}/${host}` segment of a generated proxy path so the
 * host is replaced with its alias. Used for auto-injected endpoint values (e.g. PostHog's
 * `apiHost`) where the host is produced by an arbitrary `resolve` function.
 */
export function aliasProxyValue(value: string, proxyPrefix: string, alias: ProxyAliasConfig): string {
  const prefix = `${proxyPrefix}/`
  if (!alias || !value.startsWith(prefix))
    return value
  const rest = value.slice(prefix.length)
  const host = rest.match(/^[^/?#]+/)?.[0]
  if (!host)
    return value
  const aliased = aliasForDomain(host, alias)
  return aliased ? `${prefix}${aliased}${rest.slice(host.length)}` : value
}
