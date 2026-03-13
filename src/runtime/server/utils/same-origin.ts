import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'

/**
 * Validate that a request originates from the same host.
 * Checks Origin header first (set by fetch/XHR), falls back to Referer (set by navigation/img).
 * Throws 403 if the request is cross-origin.
 */
export function validateSameOrigin(event: H3Event): void {
  const host = getHeader(event, 'host')
  if (!host)
    return

  const origin = getHeader(event, 'origin')
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        throw createError({ statusCode: 403, statusMessage: 'Cross-origin request denied' })
      }
    }
    catch (e: any) {
      if (e.statusCode === 403)
        throw e
      // malformed origin header
      throw createError({ statusCode: 403, statusMessage: 'Invalid origin' })
    }
    return
  }

  const referer = getHeader(event, 'referer')
  if (referer) {
    try {
      if (new URL(referer).host !== host) {
        throw createError({ statusCode: 403, statusMessage: 'Cross-origin request denied' })
      }
    }
    catch (e: any) {
      if (e.statusCode === 403)
        throw e
    }
  }
}
