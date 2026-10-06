import { LRUCache } from 'lru-cache'

export interface LruCacheDriverOptions {
  max?: number
  maxSize?: number
  maxEntrySize?: number
}

/**
 * Storage driver for the Nuxt Scripts cache mount. unstorage's own `lru-cache` driver
 * expects the app to install `lru-cache`, which Nitro 3 no longer does, so this one
 * imports it from Nuxt Scripts instead.
 */
export default function lruCacheDriver(opts: LruCacheDriverOptions = {}) {
  const cache = new LRUCache<string, any>({
    max: 1000,
    sizeCalculation: opts.maxSize || opts.maxEntrySize
      ? (value, key) => key.length + byteLength(value)
      : undefined,
    ...opts,
  })

  return {
    name: 'nuxt-scripts-lru-cache',
    options: opts,
    getInstance: () => cache,
    hasItem: (key: string) => cache.has(key),
    getItem: (key: string) => cache.get(key) ?? null,
    getItemRaw: (key: string) => cache.get(key) ?? null,
    setItem: (key: string, value: unknown) => {
      cache.set(key, value)
    },
    setItemRaw: (key: string, value: unknown) => {
      cache.set(key, value)
    },
    removeItem: (key: string) => {
      cache.delete(key)
    },
    getKeys: () => [...cache.keys()],
    clear: () => {
      cache.clear()
    },
    dispose: () => {
      cache.clear()
    },
  }
}

// unstorage passes serialized strings to `setItem` and binary payloads to `setItemRaw`
function byteLength(value: unknown): number {
  if (typeof value === 'string')
    return typeof Buffer !== 'undefined' ? Buffer.byteLength(value) : value.length
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
    return value.byteLength
  return JSON.stringify(value)?.length ?? 0
}
