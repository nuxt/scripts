/**
 * Build a proxy URL (path + query string) for the module's proxy endpoints.
 *
 * Used by registry helpers (e.g. gravatar) and embed components to point
 * requests at `/_scripts/proxy/*` and `/_scripts/embed/*`. These endpoints are
 * restricted to an allowlist of upstream domains.
 */
export function useScriptProxyUrl() {
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
    return parts.length ? `${path}?${parts.join('&')}` : path
  }
}
