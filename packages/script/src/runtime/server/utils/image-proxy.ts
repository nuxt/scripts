import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { createCachedBinaryFetch } from './cached-upstream'
import { withSigning } from './withSigning'

const AMP_RE = /&amp;/g

export interface ImageProxyConfig {
  allowedDomains: string[] | ((hostname: string) => boolean)
  accept?: string
  userAgent?: string
  cacheMaxAge?: number
  /** Allowed response Content-Type prefixes. SVG is always rejected as active content. */
  contentTypePrefixes?: string[]
  /** Follow redirects after applying the same URL allowlist to every hop. */
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
    contentTypePrefixes = ['image/'],
    followRedirects = true,
    decodeAmpersands = false,
    cacheName = Array.isArray(config.allowedDomains)
      ? `nuxt-scripts-img:${config.allowedDomains[0] || 'default'}`
      : 'nuxt-scripts-img:custom',
  } = config

  const domainAllowed = (hostname: string) => typeof config.allowedDomains === 'function'
    ? config.allowedDomains(hostname)
    : config.allowedDomains.includes(hostname)
  const urlAllowed = (url: URL) => (url.protocol === 'http:' || url.protocol === 'https:')
    && !url.username
    && !url.password
    && domainAllowed(url.hostname)

  const cachedFetch = createCachedBinaryFetch(cacheName, cacheMaxAge, {
    allowUrl: urlAllowed,
  })

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

    if (!urlAllowed(parsedUrl)) {
      throw createError({
        statusCode: domainAllowed(parsedUrl.hostname) ? 400 : 403,
        statusMessage: domainAllowed(parsedUrl.hostname) ? 'Invalid image URL' : 'Domain not allowed',
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

    if (result.status >= 300 && result.status < 400 && result.status !== 304) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Redirects not allowed',
      })
    }

    const responseContentType = result.contentType
    const upstreamContentType = responseContentType?.split(';', 1)[0]?.trim().toLowerCase()
    const contentTypeAllowed = upstreamContentType
      && upstreamContentType !== 'image/svg+xml'
      && contentTypePrefixes.some(prefix => upstreamContentType.startsWith(prefix))
    if (!responseContentType || !contentTypeAllowed) {
      throw createError({
        statusCode: 415,
        statusMessage: 'Unsupported upstream content type',
      })
    }

    setHeader(event, 'Content-Type', responseContentType)
    setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
    setHeader(event, 'Content-Security-Policy', 'sandbox; default-src \'none\'')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')

    return result.body
  }))
}
