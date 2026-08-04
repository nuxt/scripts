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

vi.mock('nitropack/runtime', () => ({ defineCachedFunction }))

describe('upstream cache storage ownership', () => {
  beforeEach(() => {
    defineCachedFunction.mockClear()
  })

  it('installs a bounded cache mount without registry server endpoints', () => {
    const nitroOptions: { storage?: Record<string, unknown> } = {}

    ensureNuxtScriptsCacheStorage(nitroOptions)

    expect(nitroOptions.storage?.[NUXT_SCRIPTS_CACHE_BASE]).toEqual(expect.objectContaining({
      driver: 'lru-cache',
      max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    }))
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
