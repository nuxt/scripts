import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createResolver, resolveAlias } from '@nuxt/kit'
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
    const driver = fileURLToPath(new URL('../../packages/script/src/runtime/server/utils/lru-cache-driver.ts', import.meta.url))

    ensureNuxtScriptsCacheStorage(nitroOptions, driver)

    expect(nitroOptions.storage?.[NUXT_SCRIPTS_CACHE_BASE]).toEqual(expect.objectContaining({
      max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    }))
  })

  it('loads the cache driver through native ESM from a path with special characters', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nuxt-scripts-cache-'))
    try {
      const driverDir = join(root, 'cache # % ü')
      const sourceDir = fileURLToPath(new URL('../../packages/script/src/runtime/server/utils/', import.meta.url))
      await symlink(sourceDir, driverDir, 'junction')
      const nitroOptions: { storage?: Record<string, { driver: string }> } = {}
      ensureNuxtScriptsCacheStorage(nitroOptions, join(driverDir, 'lru-cache-driver.ts'))
      const driver = nitroOptions.storage![NUXT_SCRIPTS_CACHE_BASE]!.driver

      const value = execFileSync(process.execPath, ['--input-type=module', '-e', `
        const { default: createDriver } = await import(process.argv[1])
        const cache = createDriver({ max: 2 })
        cache.setItem('key', 'value')
        process.stdout.write(cache.getItem('key'))
      `, driver], { encoding: 'utf8' })

      expect(value).toBe('value')
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('resolves the driver URL to a local file for server bundling', () => {
    const driver = createResolver(import.meta.url).resolve('../../packages/script/src/runtime/server/utils/lru-cache-driver.ts')
    const nitroOptions: { alias?: Record<string, string> } = {}

    ensureNuxtScriptsCacheStorage(nitroOptions, driver)

    expect(resolveAlias(pathToFileURL(driver).href, nitroOptions.alias)).toBe(driver)
  })

  it('preserves an application cache mount', () => {
    const mount = { driver: 'redis', url: 'redis://localhost:6379' }
    const nitroOptions = { storage: { [NUXT_SCRIPTS_CACHE_BASE]: mount } }

    ensureNuxtScriptsCacheStorage(nitroOptions, '/nuxt-scripts/lru-cache-driver')

    expect(nitroOptions.storage[NUXT_SCRIPTS_CACHE_BASE]).toBe(mount)
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
