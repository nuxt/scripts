/** Dedicated Nitro storage mount used by Nuxt Scripts' upstream caches. */
export const NUXT_SCRIPTS_CACHE_BASE = 'nuxt-scripts-cache'

/**
 * Conservative defaults for the in-process fallback. Applications can replace
 * this mount with Redis, KV, filesystem, or their own storage configuration.
 */
export const NUXT_SCRIPTS_CACHE_MAX_ENTRIES = 500
export const NUXT_SCRIPTS_CACHE_MAX_SIZE = 32 * 1024 * 1024
export const NUXT_SCRIPTS_CACHE_MAX_ENTRY_SIZE = 8 * 1024 * 1024
