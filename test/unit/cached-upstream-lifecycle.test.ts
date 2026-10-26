import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveAlias } from '@nuxt/kit'
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
      driver: pathToFileURL('/nuxt-scripts/lru-cache-driver').href,
      max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    }))
  })

  it('loads the cache driver through the native ESM loader', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nuxt-scripts-cache-'))
    try {
      const driverDir = join(root, 'space # percent % ü')
      const sourceDir = fileURLToPath(new URL('../../packages/script/src/runtime/server/utils/', import.meta.url))
      await symlink(sourceDir, driverDir, 'junction')
      const nitroOptions: { storage?: Record<string, { driver: string }> } = {}
      ensureNuxtScriptsCacheStorage(nitroOptions, join(driverDir, 'lru-cache-driver.ts'))

      // Nitro imports custom storage drivers directly, outside the bundler.
      expect(() => execFileSync(process.execPath, ['--input-type=module-typescript', '-e', `
        import assert from 'node:assert/strict'
        const { default: createDriver } = await import(process.argv[1])
        const driver = createDriver({ max: 2 })
        driver.setItem('key', 'value')
        assert.equal(driver.getItem('key'), 'value')
      `, nitroOptions.storage![NUXT_SCRIPTS_CACHE_BASE]!.driver], { stdio: 'pipe' })).not.toThrow()
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('preserves an application cache mount', () => {
    const mount = { driver: 'redis', url: 'redis://localhost:6379' }
    const nitroOptions = { storage: { [NUXT_SCRIPTS_CACHE_BASE]: mount } }

    ensureNuxtScriptsCacheStorage(nitroOptions, '/nuxt-scripts/lru-cache-driver')

    expect(nitroOptions.storage[NUXT_SCRIPTS_CACHE_BASE]).toBe(mount)
  })

  it('resolves the driver URL to a local file for server bundling', () => {
    const driver = fileURLToPath(new URL('../../packages/script/src/runtime/server/utils/lru-cache-driver.ts', import.meta.url))
    const nitroOptions: { storage?: Record<string, unknown>, alias?: Record<string, string> } = {}

    ensureNuxtScriptsCacheStorage(nitroOptions, driver)

    expect(resolveAlias(pathToFileURL(driver).href, nitroOptions.alias)).toBe(driver)
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
