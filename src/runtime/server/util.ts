import {prefixStorage} from "unstorage";
import {useRuntimeConfig, useStorage} from "#imports";
import {sha256base64} from 'ohash'
import { Script } from '@unhead/schema'
import type { Storage } from 'unstorage'

export async function useCachedScript(src: string, options?: { ttl?: number; purge?: boolean }) {
    const key = src as string
    const ttl = options?.ttl || useRuntimeConfig()['nuxt-script'].proxyTtl || 0

    const useCache = true
    const cache = prefixStorage(useStorage(), `/cache/nuxt-script/proxy`) as Storage<{ value: Script; expiresAt: number }>
    let cacheResult = 'MISS'
    let cacheExpires = 0
    // cache will invalidate if the options change
    let script: Script | false = false
    if (useCache && await cache.hasItem(key)) {
        const { value, expiresAt } = await cache.getItem(key)
        if (expiresAt > Date.now()) {
            if (options?.purge) {
                cacheResult = 'PURGE'
                await cache.removeItem(key)
            }
            else {
                cacheResult = 'HIT'
                cacheExpires = expiresAt
                script = value
            }
        }
        else {
            await cache.removeItem(key)
        }
    }
    if (!script) {
        const result = await globalThis.$fetch.raw(src as string, {
            // make sure we're only getting scripts
            headers: {
                'accept': 'application/javascript',
            }
        })
        if (!result._data || !result.status.toString().startsWith('2') || !result.headers.get('content-type')?.endsWith('/javascript')) {
            return null
        }
        script = {
            innerHTML: result._data,
            integrity: `sha256-${sha256base64(result._data)}`
        }
        if (useCache) {
            await cache.setItem(key, { value: script, expiresAt: Date.now() + ttl })
        }
    }
    return { script, cacheExpires, cacheResult, ttl }
}
