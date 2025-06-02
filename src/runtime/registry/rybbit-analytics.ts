import { useRegistryScript } from '../utils'
import { array, boolean, number, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const RybbitAnalyticsOptions = object({
  siteId: union([string(), number()]), // required
  trackSpa: optional(boolean()),
  trackQuery: optional(boolean()),
  skipPatterns: optional(array(string())),
  maskPatterns: optional(array(string())),
  debounce: optional(number()),
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
        'data-track-spa': options?.trackSpa,
        'data-track-query': options?.trackQuery,
        'data-skip-patterns': options?.skipPatterns ? JSON.stringify(options.skipPatterns) : undefined,
        'data-mask-patterns': options?.maskPatterns ? JSON.stringify(options.maskPatterns) : undefined,
        'data-debounce': options?.debounce ? options.debounce.toString() : undefined,
      },
      schema: import.meta.dev ? RybbitAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          return { rybbit: window.rybbit }
        },
      },
    }
  }, _options)
}
