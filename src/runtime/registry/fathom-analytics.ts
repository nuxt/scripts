import { type Input, boolean, literal, object, optional, string, union } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export const FathomAnalyticsOptions = object({
  'site': string(), // site is required
  'src': optional(string()),
  'data-spa': optional(union([literal('auto'), literal('history'), literal('hash')])),
  'data-auto': optional(boolean()),
  'data-canonical': optional(boolean()),
  'data-honor-dnt': optional(boolean()),
})

export interface FathomAnalyticsApi {
  trackPageview: (ctx?: { url: string, referrer?: string }) => void
  trackEvent: (eventName: string, value: { _value: number }) => void
}

declare global {
  interface Window {
    fathom: FathomAnalyticsApi
  }
}

export function useScriptFathomAnalytics<T extends FathomAnalyticsApi>(options?: Input<typeof FathomAnalyticsOptions>, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  if (import.meta.dev) {
    scriptOptions.beforeInit = () => {
      validateScriptInputSchema(FathomAnalyticsOptions, options)
    }
  }
  return useScript<FathomAnalyticsApi>({
    src: 'https://cdn.usefathom.com/script.js',
    defer: true,
    ...options,
  }, {
    ...scriptOptions,
    use: () => window.fathom,
  })
}
