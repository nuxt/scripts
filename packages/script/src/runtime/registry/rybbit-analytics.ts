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
}

declare global {
  interface Window {
    rybbit?: RybbitAnalyticsApi
  }
}

// The script proxy records calls made before the script loads and replays them
// once it resolves, so buffering them here too would send every event twice.
function isRybbitReady() {
  return typeof window !== 'undefined' && typeof window.rybbit?.event === 'function'
}

export function useScriptRybbitAnalytics<T extends RybbitAnalyticsApi>(_options?: RybbitAnalyticsInput) {
  const call = (method: string, ...args: any[]) => {
    if (!isRybbitReady())
      return
    const fn = (window.rybbit as any)[method]
    if (typeof fn === 'function')
      fn.apply(window.rybbit, args)
  }

  return useRegistryScript<T, typeof RybbitAnalyticsOptions>('rybbitAnalytics', (options) => {
    return {
      scriptInput: {
        'src': options?.analyticsHost ? `${options.analyticsHost}/script.js` : 'https://app.rybbit.io/api/script.js',
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
          return {
            pageview: () => call('pageview'),
            event: (name: string, properties?: Record<string, any>) => call('event', name, properties),
            identify: (userId: string) => call('identify', userId),
            clearUserId: () => call('clearUserId'),
            getUserId: () => window.rybbit?.getUserId?.() ?? null,
          } as RybbitAnalyticsApi
        },
      },
    }
  }, _options)
}
