import { useRegistryScript } from '../utils'
import { boolean, literal, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const FathomAnalyticsOptions = object({
  /**
   * The Fathom Analytics site ID.
   */
  site: string(),
  /**
   * The Fathom Analytics tracking mode.
   */
  spa: optional(union([literal('auto'), literal('history'), literal('hash')])),
  /**
   * Automatically track page views.
   */
  auto: optional(boolean()),
  /**
   * Enable canonical URL tracking.
   */
  canonical: optional(boolean()),
  /**
   * Honor Do Not Track requests.
   */
  honorDnt: optional(boolean()),
})

export type FathomAnalyticsInput = RegistryScriptInput<typeof FathomAnalyticsOptions, false>

export interface FathomAnalyticsApi {
  beacon: (ctx: { url: string, referrer?: string }) => void
  blockTrackingForMe: () => void
  enableTrackingForMe: () => void
  isTrackingEnabled: () => boolean
  send: (type: string, data: unknown) => void
  setSite: (siteId: string) => void
  sideId: string
  trackPageview: (ctx?: { url: string, referrer?: string }) => void
  trackGoal: (goalId: string, cents: number) => void
  trackEvent: (eventName: string, value: { _value: number }) => void
}

declare global {
  interface Window {
    fathom: FathomAnalyticsApi
  }
}

export function useScriptFathomAnalytics<T extends FathomAnalyticsApi>(_options?: FathomAnalyticsInput) {
  return useRegistryScript<T, typeof FathomAnalyticsOptions>(_options?.key || 'fathomAnalytics', options => ({
    scriptInput: {
      src: 'https://cdn.usefathom.com/script.js', // can't be bundled
      // append the data attr's
      ...Object.entries(options)
        .filter(([key]) => ['site', 'spa', 'auto', 'canonical', 'honorDnt'].includes(key))
        .reduce((acc, [_key, value]) => {
          // need to convert camel case to kebab case
          const key = _key === 'honourDnt' ? 'honor-dnt' : _key
          // @ts-expect-error untyped
          acc[`data-${key}`] = value
          return acc
        }, {}),
    },
    schema: import.meta.dev ? FathomAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return window.fathom
      },
    },
  }), _options)
}
