import type { Ref } from 'vue'
import { ref } from 'vue'
import type { NuxtUseScriptOptions } from './types'
import { logger } from './logger'

export interface NpmScriptStubOptions {
  key: string
  use?: () => any
  clientInit?: () => void | Promise<any>
  trigger?: NuxtUseScriptOptions['trigger']
}

export interface NpmScriptStub<T = any> {
  status: Ref<'awaitingLoad' | 'loading' | 'loaded' | 'error'>
  load: () => Promise<void>
  onLoaded: (callback: (api: T) => void) => void
  proxy: T
  $script?: any
}

/**
 * Creates a script stub for NPM-only packages (no external script tag)
 * Manages lifecycle and status without relying on script tag loading
 */
export function createNpmScriptStub<T = any>(
  options: NpmScriptStubOptions,
): NpmScriptStub<T> {
  const status = ref<'awaitingLoad' | 'loading' | 'loaded' | 'error'>('awaitingLoad')
  const loadedCallbacks: Array<(api: T) => void> = []
  let initPromise: Promise<any> | null = null
  let hasInitialized = false

  // Get the proxy/API from use() function
  const proxy = (options.use?.() || {}) as T

  const stub: NpmScriptStub<T> = {
    status: status as Ref<'awaitingLoad' | 'loading' | 'loaded' | 'error'>,
    proxy,

    async load() {
      // Prevent multiple initialization
      if (hasInitialized || status.value !== 'awaitingLoad')
        return

      hasInitialized = true
      status.value = 'loading'

      try {
        // Call clientInit if provided
        if (options.clientInit) {
          // eslint-disable-next-line no-console
          console.log(`[NpmScriptStub] Initializing ${options.key}...`)
          initPromise = Promise.resolve(options.clientInit())
          await initPromise
          // eslint-disable-next-line no-console
          console.log(`[NpmScriptStub] ${options.key} initialized successfully`)
        }

        status.value = 'loaded'

        // Fire all onLoaded callbacks with the proxy
        loadedCallbacks.forEach((cb) => {
          try {
            cb(proxy)
          }
          catch (error) {
            logger.error(`[NpmScriptStub] Error in onLoaded callback for ${options.key}:`, error)
          }
        })
      }
      catch (error) {
        logger.error(`[NpmScriptStub] Failed to initialize ${options.key}:`, error)
        status.value = 'error'
      }
    },

    onLoaded(callback) {
      if (status.value === 'loaded') {
        // Already loaded, call immediately
        callback(proxy)
      }
      else {
        // Queue for when load completes
        loadedCallbacks.push(callback)
      }
    },

    // Mock $script for compatibility with useScript API
    get $script() {
      return {
        status: status.value,
        load: stub.load,
      }
    },
  }

  // Auto-trigger based on trigger option
  if (options.trigger) {
    if (typeof options.trigger === 'function') {
      // Custom trigger function (e.g., onNuxtReady)
      const res = (options.trigger as any)(() => stub.load())
      if (res && typeof res === 'object' && 'then' in res)
        res.then(() => stub.load())
    }
    else if (options.trigger === 'manual') {
      // Manual trigger - do nothing, user calls load()
    }
    else if (options.trigger === 'onNuxtReady') {
      // onNuxtReady string - import and use onNuxtReady
      import('nuxt/app').then(({ onNuxtReady }) => {
        onNuxtReady(() => stub.load())
      })
    }
    else if (options.trigger === 'client') {
      // Load immediately on client
      if (import.meta.client) {
        stub.load()
      }
    }
  }
  else {
    // Default: load immediately on client
    if (import.meta.client) {
      stub.load()
    }
  }

  return stub
}
