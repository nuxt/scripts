import { PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM, SIG_PARAM } from './sign-constants'

const PROXY_AUTH_PARAMS = new Set([SIG_PARAM, PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM])

/** Remove proxy-only credentials before constructing an upstream URL or cache key. */
export function stripProxyAuthQuery(query: Record<string, unknown>): Record<string, unknown> {
  const upstreamQuery: Record<string, unknown> = Object.create(null)
  for (const [key, value] of Object.entries(query)) {
    if (!PROXY_AUTH_PARAMS.has(key))
      upstreamQuery[key] = value
  }
  return upstreamQuery
}
