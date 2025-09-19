import { useRegistryScript } from '../utils'
import { array, boolean, number, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const RybbitAnalyticsOptions = object({
  siteId: union([string(), number()]), // required
  autoTrackPageview: optional(boolean()),
  trackSpa: optional(boolean()),
  trackQuery: optional(boolean()),
  trackOutbound: optional(boolean()),
  trackErrors: optional(boolean()),
  sessionReplay: optional(boolean()),
  webVitals: optional(boolean()),
  skipPatterns: optional(array(string())),
  maskPatterns: optional(array(string())),
  debounce: optional(number()),
  apiKey: optional(string()),
})

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

export function useScriptRybbitAnalytics<T extends RybbitAnalyticsApi>(_options?: RybbitAnalyticsInput) {
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
          if (typeof window.rybbit === 'undefined') {
            return null
          }
          return {
            pageview: window.rybbit.pageview,
            event: window.rybbit.event,
            identify: window.rybbit.identify,
            clearUserId: window.rybbit.clearUserId,
            getUserId: window.rybbit.getUserId,
            rybbit: window.rybbit,
          } satisfies RybbitAnalyticsApi
        },
      },
    }
  }, _options)
}
