import { type Input, boolean, literal, object, optional, string, union } from 'valibot'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
import type { NuxtUseScriptIntegrationOptions } from '#nuxt-scripts'

export const FathomAnalyticsOptions = object({
  'data-site': string(), // site is required
  'src': optional(string()),
  'data-spa': optional(union([literal('auto'), literal('history'), literal('hash')])),
  'data-auto': optional(boolean()),
  'data-canonical': optional(boolean()),
  'data-honor-dnt': optional(boolean()),
})

export type FathomAnalyticsInput = Input<typeof FathomAnalyticsOptions>

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

export function useScriptFathomAnalytics<T extends FathomAnalyticsApi>(options?: FathomAnalyticsInput, scriptOptions?: Omit<NuxtUseScriptIntegrationOptions, 'assetStrategy'>) {
  return useScript<T>({
    src: String('https://cdn.usefathom.com/script.js'), // can't be bundled
    ...options,
  }, {
    ...registryScriptOptions({
      scriptOptions,
      schema: FathomAnalyticsOptions,
      options,
    }),
    use() {
      return window.fathom
    },
  })
}
