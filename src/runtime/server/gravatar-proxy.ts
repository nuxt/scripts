import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, getHeader, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const proxyConfig = (runtimeConfig.public['nuxt-scripts'] as any)?.gravatarProxy

  // Validate referer to prevent external abuse
  const referer = getHeader(event, 'referer')
  const host = getHeader(event, 'host')
  if (referer && host) {
    let refererHost: string | undefined
    try {
      refererHost = new URL(referer).host
    }
    catch {}
    if (refererHost && refererHost !== host) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid referer',
      })
    }
  }

  const query = getQuery(event)
  let hash = query.hash as string | undefined
  const email = query.email as string | undefined

  // Server-side hashing: email never leaves your server
  if (!hash && email) {
    const encoder = new TextEncoder()
    const data = encoder.encode(email.trim().toLowerCase())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  if (!hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Either hash or email parameter is required',
    })
  }

  // Build Gravatar URL with query params
  const size = query.s as string || '80'
  const defaultImg = query.d as string || 'mp'
  const rating = query.r as string || 'g'

  const gravatarUrl = withQuery(`https://www.gravatar.com/avatar/${hash}`, {
    s: size,
    d: defaultImg,
    r: rating,
  })

  const response = await $fetch.raw(gravatarUrl, {
    responseType: 'arrayBuffer',
    headers: {
      'User-Agent': 'Nuxt Scripts Gravatar Proxy',
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Gravatar avatar',
    })
  })

  const cacheMaxAge = proxyConfig?.cacheMaxAge ?? 3600
  setHeader(event, 'Content-Type', response.headers.get('content-type') || 'image/jpeg')
  setHeader(event, 'Cache-Control', `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`)
  setHeader(event, 'Vary', 'Accept-Encoding')

  return response._data
})
