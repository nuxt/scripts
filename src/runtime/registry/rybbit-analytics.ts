import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { RybbitAnalyticsOptions } from './schemas'

export { RybbitAnalyticsOptions }

export type RybbitAnalyticsInput = RegistryScriptInput<typeof RybbitAnalyticsOptions, false>

export interface RybbitAnalyticsApi {
  /**
   * Tracks a page view
   */
  pageview: () => void

  /**
   * Tracks a custom event
   * @param name Name of the event
   * @param properties Optional properties for the event
   */
  event: (name: string, properties?: Record<string, any>) => void

  /**
   * Sets a custom user ID for tracking logged-in users
   * @param userId The user ID to set (will be stored in localStorage)
   */
  identify: (userId: string) => void

  /**
   * Clears the stored user ID
   */
  clearUserId: () => void

  /**
   * Gets the currently set user ID
   * @returns The current user ID or null if not set
   */
  getUserId: () => string | null
  /**
   * @deprecated use top level functions instead
   */
  rybbit: RybbitAnalyticsApi
}

declare global {
  interface Window {
    rybbit: RybbitAnalyticsApi
  }
}

// Queue state stored on globalThis to persist across module instances
// Using Symbol to avoid conflicts - don't use window.rybbit as stub
// because Rybbit's script checks for it and skips init if it exists
const RYBBIT_QUEUE_KEY = Symbol.for('nuxt-scripts.rybbit-queue')

interface RybbitQueueState {
  queue: Array<[string, ...any[]]>
  flushed: boolean
}

function getRybbitState(): RybbitQueueState | undefined {
  if (!import.meta.client)
    return
  const g = globalThis as any
  if (!g[RYBBIT_QUEUE_KEY]) {
    g[RYBBIT_QUEUE_KEY] = { queue: [], flushed: false }
  }
  return g[RYBBIT_QUEUE_KEY]
}

export function useScriptRybbitAnalytics<T extends RybbitAnalyticsApi>(_options?: RybbitAnalyticsInput) {
  // Check if real Rybbit is loaded
  const isRybbitReady = () => import.meta.client
    && typeof window !== 'undefined'
    && window.rybbit
    && typeof window.rybbit.event === 'function'

  // Flush queued calls to real implementation
  const flushQueue = () => {
    const state = getRybbitState()
    if (!state || state.flushed || !isRybbitReady())
      return
    state.flushed = true
    while (state.queue.length > 0) {
      const [method, ...args] = state.queue.shift()!
      const fn = (window.rybbit as any)[method]
      if (typeof fn === 'function') {
        fn.apply(window.rybbit, args)
      }
    }
  }

  // Wrapper that queues or calls directly
  const callOrQueue = (method: string, ...args: any[]) => {
    if (isRybbitReady()) {
      const fn = (window.rybbit as any)[method]
      if (typeof fn === 'function') {
        fn.apply(window.rybbit, args)
      }
    }
    else {
      getRybbitState()?.queue.push([method, ...args])
    }
  }

  return useRegistryScript<T, typeof RybbitAnalyticsOptions>('rybbitAnalytics', (options) => {
    return {
      scriptInput: {
        'src': 'https://app.rybbit.io/api/script.js',
        'data-site-id': String(options?.siteId),
        'data-auto-track-pageview': options?.autoTrackPageview,
        'data-track-spa': options?.trackSpa,
        'data-track-query': options?.trackQuery,
        'data-track-outbound': options?.trackOutbound,
        'data-track-errors': options?.trackErrors,
        'data-session-replay': options?.sessionReplay,
        'data-web-vitals': options?.webVitals,
        'data-skip-patterns': options?.skipPatterns ? JSON.stringify(options.skipPatterns) : undefined,
        'data-mask-patterns': options?.maskPatterns ? JSON.stringify(options.maskPatterns) : undefined,
        'data-debounce': options?.debounce ? options.debounce.toString() : undefined,
        'data-api-key': options?.apiKey,
      },
      schema: import.meta.dev ? RybbitAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          // Flush queue when use() is called (happens on status changes)
          flushQueue()
          // Return wrappers that queue if not ready
          return {
            pageview: () => callOrQueue('pageview'),
            event: (name: string, properties?: Record<string, any>) => callOrQueue('event', name, properties),
            identify: (userId: string) => callOrQueue('identify', userId),
            clearUserId: () => callOrQueue('clearUserId'),
            getUserId: () => window.rybbit?.getUserId?.() ?? null,
            rybbit: window.rybbit,
          } as RybbitAnalyticsApi
        },
      },
    }
  }, _options)
}
