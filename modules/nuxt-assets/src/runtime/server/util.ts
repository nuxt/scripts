import { prefixStorage } from 'unstorage'
import { sha256base64 } from 'ohash'
import type { Script } from '@unhead/schema'
import type { Storage } from 'unstorage'

// @ts-expect-error server side import
import { useRuntimeConfig, useStorage } from '#imports'

interface CachedScript {
  value: Script
  expiresAt: number
}

export async function useCachedAsset(src: string, options?: { ttl?: number; purge?: boolean }) {
  const key = src as string

  const ttl = options?.ttl || useRuntimeConfig()['nuxt-assets']?.proxyTtl || 0

  const useCache = true
  const cache = prefixStorage(useStorage(), '/cache/nuxt-assets') as Storage<{ value: Script; expiresAt: number }>
  let cacheResult = 'MISS'
  let cacheExpires = 0
  // cache will invalidate if the options change
  let asset: Script | false = false
  if (useCache && await cache.hasItem(key)) {
    const { value, expiresAt } = (await cache.getItem<CachedScript>(key))!
    if (expiresAt > Date.now()) {
      if (options?.purge) {
        cacheResult = 'PURGE'
        await cache.removeItem(key)
      }
      else {
        cacheResult = 'HIT'
        cacheExpires = expiresAt
        asset = value
      }
    }
    else {
      await cache.removeItem(key)
    }
  }
  if (!asset) {
    const result = await $fetch.raw<string>(src as string, {
      // make sure we're only getting scripts
      // headers: {
      //   accept: 'application/javascript',
      // },
    })
    if (!result._data || !result.status.toString().startsWith('2')/* || !result.headers.get('content-type')?.endsWith('/javascript') */)
      return null

    const blob = result._data as unknown as Blob
    // convert blob to string
    asset = {
      innerHTML: await blob.text(),
      integrity: `sha256-${sha256base64(result._data as string)}`,
    }
    if (useCache)
      await cache.setItem(key, { value: asset, expiresAt: Date.now() + ttl })
  }
  return { asset, cacheExpires, cacheResult, ttl }
}
