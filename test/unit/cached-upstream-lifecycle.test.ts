import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureNuxtScriptsCacheStorage,
  NUXT_SCRIPTS_CACHE_BASE,
  NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
} from '../../packages/script/src/runtime/server/utils/cache-config'
import { createCachedBinaryFetch, createCachedJsonFetch } from '../../packages/script/src/runtime/server/utils/cached-upstream'

const { defineCachedFunction } = vi.hoisted(() => ({
  defineCachedFunction: vi.fn((fn: (...args: any[]) => any) => fn),
}))

vi.mock('#nuxt-scripts/nitro', () => ({ defineCachedFunction }))

describe('upstream cache storage ownership', () => {
  beforeEach(() => {
    defineCachedFunction.mockClear()
  })

  it('installs a bounded cache mount without registry server endpoints', () => {
    const nitroOptions: { storage?: Record<string, unknown> } = {}

    ensureNuxtScriptsCacheStorage(nitroOptions, '/nuxt-scripts/lru-cache-driver')

    expect(nitroOptions.storage?.[NUXT_SCRIPTS_CACHE_BASE]).toEqual(expect.objectContaining({
      driver: '/nuxt-scripts/lru-cache-driver',
      max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    }))
  })

  it('installs the cache mount under `kv` on Nitro v3', () => {
    const nitroOptions: { storage?: Record<string, unknown>, kv?: Record<string, unknown> } = {}

    ensureNuxtScriptsCacheStorage(nitroOptions, '/nuxt-scripts/lru-cache-driver', 3)

    expect(nitroOptions.storage).toBeUndefined()
    expect(nitroOptions.kv?.[NUXT_SCRIPTS_CACHE_BASE]).toEqual(expect.objectContaining({
      driver: '/nuxt-scripts/lru-cache-driver',
      max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    }))
  })

  it('preserves an application mount under either key on Nitro v3', () => {
    const userMount = { driver: 'redis' }
    const legacy: { storage?: Record<string, unknown>, kv?: Record<string, unknown> } = { storage: { [NUXT_SCRIPTS_CACHE_BASE]: userMount } }
    const current: { storage?: Record<string, unknown>, kv?: Record<string, unknown> } = { kv: { [NUXT_SCRIPTS_CACHE_BASE]: userMount } }

    ensureNuxtScriptsCacheStorage(legacy, '/nuxt-scripts/lru-cache-driver', 3)
    ensureNuxtScriptsCacheStorage(current, '/nuxt-scripts/lru-cache-driver', 3)

    expect(legacy.kv).toBeUndefined()
    expect(legacy.storage?.[NUXT_SCRIPTS_CACHE_BASE]).toBe(userMount)
    expect(current.kv?.[NUXT_SCRIPTS_CACHE_BASE]).toBe(userMount)
  })

  it('puts binary proxy payloads in the bounded Nuxt Scripts cache mount', () => {
    createCachedBinaryFetch('binary-test', 60)

    expect(defineCachedFunction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ base: NUXT_SCRIPTS_CACHE_BASE }),
    )
  })

  it('puts JSON proxy payloads in the same bounded cache mount', () => {
    createCachedJsonFetch('json-test', 60, url => url, {
      allowUrl: () => true,
    })

    expect(defineCachedFunction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ base: NUXT_SCRIPTS_CACHE_BASE }),
    )
  })
})
