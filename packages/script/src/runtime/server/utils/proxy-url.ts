/**
 * Build a proxy URL with query params.
 *
 * Used by embed handlers that inject proxy URLs into HTML/JSON responses so
 * the client loads upstream assets through the site origin. The proxy
 * endpoints are restricted to an allowlist of upstream domains.
 */
export function buildProxyUrl(path: string, query: Record<string, unknown>): string {
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
  return parts.length ? `${path}?${parts.join('&')}` : path
}
