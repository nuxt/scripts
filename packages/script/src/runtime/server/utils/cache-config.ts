import { pathToFileURL } from 'node:url'

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
  alias?: Record<string, string>
}

export function ensureNuxtScriptsCacheStorage(nitroOptions: NitroOptionsWithStorage, driver: string): void {
  nitroOptions.storage ||= {}
  if (nitroOptions.storage[NUXT_SCRIPTS_CACHE_BASE])
    return

  // Nitro imports custom drivers with the native ESM loader during setup.
  const driverURL = pathToFileURL(driver).href
  // Rollup needs a local path to bundle the driver into the server output.
  nitroOptions.alias ||= {}
  nitroOptions.alias[driverURL] = driver
  nitroOptions.storage[NUXT_SCRIPTS_CACHE_BASE] = {
    driver: driverURL,
    max: NUXT_SCRIPTS_CACHE_MAX_ENTRIES,
    maxSize: NUXT_SCRIPTS_CACHE_MAX_SIZE,
    maxEntrySize: NUXT_SCRIPTS_CACHE_MAX_ENTRY_SIZE,
  }
}
