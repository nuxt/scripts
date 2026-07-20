import type { Ref } from 'vue'
import type { NuxtUseScriptOptions } from './types'
import { ref } from 'vue'
import { logger } from './logger'

export interface NpmScriptStubOptions {
  key: string
  use?: () => any
  clientInit?: () => void | Promise<any>
  trigger?: NuxtUseScriptOptions['trigger']
}

export interface NpmScriptStub<T = any> {
  id: string
  status: Ref<'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'>
  signal: AbortSignal
  readonly script: NpmScriptStub<T>
  dispose: () => void
  remove: () => boolean
  load: () => Promise<void>
  onLoaded: (callback: (api: T) => void) => () => void
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
  const status = ref<'awaitingLoad' | 'loading' | 'loaded' | 'error' | 'removed'>('awaitingLoad')
  const lifecycleController = new AbortController()
  const loadedCallbacks: Array<(api: T) => void> = []
  const triggerCleanups = new Set<() => void>()
  let hasInitialized = false
  let disposed = false

  // Get the proxy/API from use() function
  const proxy = (options.use?.() || {}) as T

  const stub: NpmScriptStub<T> = {
    id: options.key,
    status,
    signal: lifecycleController.signal,
    proxy,

    get script() {
      return stub
    },

    dispose() {
      if (disposed)
        return
      disposed = true
      lifecycleController.abort()
      loadedCallbacks.splice(0)
      for (const cleanup of triggerCleanups)
        cleanup()
      triggerCleanups.clear()
      status.value = 'removed'
    },

    remove() {
      if (disposed)
        return false
      stub.dispose()
      return true
    },

    async load() {
      // Prevent multiple initialization
      if (disposed || hasInitialized || status.value !== 'awaitingLoad')
        return

      hasInitialized = true
      status.value = 'loading'

      try {
        // Call clientInit if provided
        if (options.clientInit) {
          // eslint-disable-next-line no-console
          console.log(`[NpmScriptStub] Initializing ${options.key}...`)
          await options.clientInit()
          if (disposed)
            return
          // eslint-disable-next-line no-console
          console.log(`[NpmScriptStub] ${options.key} initialized successfully`)
        }

        if (disposed)
          return
        status.value = 'loaded'

        // Fire all onLoaded callbacks with the proxy
        // Release callback closures as soon as they have fired. Registry stubs
        // can live for the app lifetime, while their callers may not.
        loadedCallbacks.splice(0).forEach((cb) => {
          try {
            cb(proxy)
          }
          catch (error) {
            logger.error(`[NpmScriptStub] Error in onLoaded callback for ${options.key}:`, error)
          }
        })
      }
      catch (error) {
        loadedCallbacks.splice(0)
        if (disposed)
          return
        logger.error(`[NpmScriptStub] Failed to initialize ${options.key}:`, error)
        status.value = 'error'
      }
    },

    onLoaded(callback) {
      if (status.value === 'loaded') {
        // Already loaded, call immediately
        callback(proxy)
        return () => {}
      }
      else if (status.value !== 'error' && status.value !== 'removed') {
        // Queue for when load completes
        loadedCallbacks.push(callback)
      }
      return () => {
        const index = loadedCallbacks.indexOf(callback)
        if (index !== -1)
          loadedCallbacks.splice(index, 1)
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
      if (typeof res === 'function')
        triggerCleanups.add(res)
      else if (res && typeof res === 'object' && 'then' in res)
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
