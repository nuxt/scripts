import { PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM } from '../server/utils/sign-constants'
import { useScriptProxyToken } from './useScriptProxyToken'

/**
 * Build proxy URLs that the server's `withSigning` middleware accepts.
 *
 * Attaches the page token emitted during SSR (`_pt` + `_ts`) when one is
 * available, so client-driven proxy calls (e.g. reactive fetches, dynamic
 * image helpers exposed in slot props) authenticate without needing a
 * server round-trip to sign each URL.
 *
 * When no token is present (signing disabled or no secret), emits plain
 * `?url=...` URLs, matching the pre-signing behavior.
 */
export function useScriptProxyUrl() {
  const token = useScriptProxyToken()
  return (path: string, query: Record<string, unknown> = {}): string => {
    const parts: string[] = []
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null)
        continue
      const encodedKey = encodeURIComponent(key)
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null)
            continue
          parts.push(`${encodedKey}=${encodeURIComponent(String(item))}`)
        }
      }
      else {
        parts.push(`${encodedKey}=${encodeURIComponent(String(value))}`)
      }
    }
    if (token.value) {
      parts.push(`${PAGE_TOKEN_PARAM}=${encodeURIComponent(token.value.token)}`)
      parts.push(`${PAGE_TOKEN_TS_PARAM}=${token.value.ts}`)
    }
    return parts.length ? `${path}?${parts.join('&')}` : path
  }
}
