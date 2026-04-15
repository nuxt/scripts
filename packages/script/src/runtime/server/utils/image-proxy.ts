import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { createCachedBinaryFetch } from './cached-upstream'
import { withSigning } from './withSigning'

const AMP_RE = /&amp;/g

export interface ImageProxyConfig {
  allowedDomains: string[] | ((hostname: string) => boolean)
  accept?: string
  userAgent?: string
  cacheMaxAge?: number
  contentType?: string
  /** Follow redirects (default: true). Set to false to reject redirects (SSRF protection). */
  followRedirects?: boolean
  /** Decode &amp; in URL query parameter */
  decodeAmpersands?: boolean
  /** Unique name for the nitro cache group (defaults to derived from allowedDomains). */
  cacheName?: string
}

export function createImageProxyHandler(config: ImageProxyConfig) {
  const {
    accept = 'image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
    userAgent,
    cacheMaxAge = 3600,
    contentType = 'image/jpeg',
    followRedirects = true,
    decodeAmpersands = false,
    cacheName = Array.isArray(config.allowedDomains)
      ? `nuxt-scripts-img:${config.allowedDomains[0] || 'default'}`
      : 'nuxt-scripts-img:custom',
  } = config

  const cachedFetch = createCachedBinaryFetch(cacheName, cacheMaxAge)

  return withSigning(defineEventHandler(async (event) => {
    const query = getQuery(event)
    let url = query.url as string

    if (decodeAmpersands && url)
      url = url.replace(AMP_RE, '&')

    if (!url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Image URL is required',
      })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    }
    catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid image URL',
      })
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL scheme',
      })
    }

    const domainAllowed = typeof config.allowedDomains === 'function'
      ? config.allowedDomains(parsedUrl.hostname)
      : config.allowedDomains.includes(parsedUrl.hostname)

    if (!domainAllowed) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Domain not allowed',
      })
    }

    const headers: Record<string, string> = { Accept: accept }
    if (userAgent)
      headers['User-Agent'] = userAgent

    const result = await cachedFetch(url, {
      timeout: 5000,
      redirect: followRedirects ? 'follow' : 'manual',
      ignoreResponseError: !followRedirects,
      headers,
    }).catch((error: any) => {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Failed to fetch image',
      })
    })

    if (!followRedirects && result.status >= 300 && result.status < 400) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Redirects not allowed',
      })
    }

    setHeader(event, 'Content-Type', result.contentType || contentType)
    setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)

    return result.body
  }))
}
