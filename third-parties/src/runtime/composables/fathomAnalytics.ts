import type { ThirdPartyScriptOptions } from '../types'
import { validateRequiredOptions } from '../util'
import { toValue, useScript } from '#imports'

export interface FathomAnalyticsOptions {
  site: string // site is required
  src?: string
  spa?: 'auto' | 'history' | 'hash'
  auto?: boolean
  canonical?: boolean
  excludedDomains?: string[]
  honorDnt?: boolean
  // TODO full config
}

export interface FathomAnalyticsApi {
  trackPageview: (ctx?: { url: string, referrer?: string }) => void
  trackGoal: (eventName: string, eventValue: number) => void
  // TODO full API
}

declare global {
  interface Window {
    fathom: FathomAnalyticsApi
  }
}

export function useFathomAnalytics(options: ThirdPartyScriptOptions<FathomAnalyticsOptions, FathomAnalyticsApi>) {
  const key = 'fathom'
  validateRequiredOptions(key, options, ['site'])
  return useScript<FathomAnalyticsApi>({
    key, // dedupe based on site, allow multiple instances (maybe needed)
    'src': (toValue(options.src) || 'https://cdn.usefathom.com/script.js') as string,
    'defer': true,
    'data-site': options.site!,
  }, {
    ...options,
    use: () => window.fathom,
  })
}
