import { buildSignedProxyUrl } from './sign'

/**
 * Build a proxy URL with query params, signing it when a secret is available.
 *
 * Used by embed handlers that inject proxy URLs into HTML/JSON responses.
 * When `secret` is set, URLs are HMAC-signed so clients can fetch them without
 * needing a page token. When it's undefined, URLs fall back to unsigned form
 * (which is only safe when the `withSigning` middleware has no secret either).
 */
export function buildProxyUrl(path: string, query: Record<string, unknown>, secret?: string): string {
  if (secret)
    return buildSignedProxyUrl(path, query, secret)

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
