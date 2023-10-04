import { createError, defineEventHandler, getQuery, sendError, setHeader } from 'h3'
import { createConsola } from 'consola'
import { useCachedAsset } from './util'

export default defineEventHandler(async (e) => {
  let { src, ttl, purge, integrity } = getQuery(e)

  if (typeof src !== 'string')
    return

  src = decodeURIComponent(src)
  integrity = decodeURIComponent(integrity as string)
  const cachedAsset = await useCachedAsset(src, {
    ttl: Number(ttl),
    purge: Boolean(purge),
  })

  if (!cachedAsset || !cachedAsset.asset) {
    // error
    const error = createError({
      status: 400,
      statusText: `The asset ${src} was not found.`,
    })
    return sendError(e, error)
  }
  const { asset, cacheResult, cacheExpires } = cachedAsset

  const logger = createConsola()

  // TODO handle integrity checks properly
  if (integrity && typeof integrity === 'string') {
    if (asset.integrity !== integrity)
      logger.warn(`The expected integrity was ${integrity}, received ${asset?.integrity}.\`.`)
    // TODO maybe throw error
  }

  setHeader(e, 'x-nuxt-assets-cache', cacheResult)
  setHeader(e, 'x-nuxt-assets-cache-ttl', cacheExpires.toString())
  // json
  setHeader(e, 'content-type', 'application/json; charset=utf-8')
  return asset
})
