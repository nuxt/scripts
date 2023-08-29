import { defineEventHandler, getQuery, proxyRequest, setHeader } from 'h3'
import { useCachedAsset } from './util'

export default defineEventHandler(async (e) => {
  let { src, ttl, purge } = getQuery(e)

  if (typeof src !== 'string')
    return

  src = decodeURIComponent(src)

  const cachedAsset = await useCachedAsset(src,
    {
      ttl: Number(ttl),
      purge: Boolean(purge),
    },
  )

  if (!cachedAsset || !cachedAsset.asset)
    return proxyRequest(e, src)

  const { asset, cacheResult, cacheExpires, ttl: _ttl } = cachedAsset

  setHeader(e, 'x-nuxt-script-proxy-cache', cacheResult)
  setHeader(e, 'x-nuxt-script-proxy-cache-ttl', cacheExpires.toString())
  setHeader(e, 'content-type', 'text/javascript; charset=utf-8')
  setHeader(e, 'cache-control', `public, max-age=${_ttl}, must-revalidate`)
  return asset
})
