/** Dedicated Nitro storage mount used by Nuxt Scripts' upstream caches. */
export const NUXT_SCRIPTS_CACHE_BASE = 'nuxt-scripts-cache'

/**
 * Conservative defaults for the in-process fallback. Applications can replace
 * this mount with Redis, KV, filesystem, or their own storage configuration.
 */
export const NUXT_SCRIPTS_CACHE_MAX_ENTRIES = 500
export const NUXT_SCRIPTS_CACHE_MAX_SIZE = 32 * 1024 * 1024
export const NUXT_SCRIPTS_CACHE_MAX_ENTRY_SIZE = 8 * 1024 * 1024

interface NitroOptionsWithStorage {
  storage?: Record<string, unknown>
  kv?: Record<string, unknown>
}

/**
 * Nitro v3 renamed the `storage` option to `kv` (`storage` still works but logs a
 * deprecation warning), so the mount goes to `kv` there. A mount the application
 * configured under either key is preserved.
 */
export function ensureNuxtScriptsCacheStorage(nitroOptions: NitroOptionsWithStorage, driver: string, nitroVersion: number = 2): void {
  if (nitroVersion >= 3 && nitroOptions.storage?.[NUXT_SCRIPTS_CACHE_BASE])
    return
  const mounts = nitroVersion >= 3
    ? (nitroOptions.kv ||= {})
    : (nitroOptions.storage ||= {})
  mounts[NUXT_SCRIPTS_CACHE_BASE] ||= {
    driver,
    max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    maxSize: NUXT_SCRIPTS_CACHE_MAX_SIZE,
    maxEntrySize: NUXT_SCRIPTS_CACHE_MAX_ENTRY_SIZE,
  }
}
