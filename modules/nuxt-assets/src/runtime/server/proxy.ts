import { defineEventHandler, getQuery, proxyRequest, setHeader } from 'h3'
import { useCachedAsset } from './util'

export default defineEventHandler(async (e) => {
  let { url, ttl, purge } = getQuery(e)

  if (typeof url !== 'string')
    return

  url = decodeURIComponent(url)

  const cachedAsset = await useCachedAsset(url, {
    ttl: Number(ttl),
    purge: Boolean(purge),
  })

  if (!cachedAsset || !cachedAsset.asset)
    return proxyRequest(e, url)

  const { asset, cacheResult, cacheExpires, ttl: _ttl } = cachedAsset

  setHeader(e, 'x-nuxt-script-proxy-cache', cacheResult)
  setHeader(e, 'x-nuxt-script-proxy-cache-ttl', cacheExpires.toString())
  setHeader(e, 'content-type', 'text/javascript; charset=utf-8')
  setHeader(e, 'cache-control', `public, max-age=${_ttl}, must-revalidate`)
  return asset.innerHTML
})
