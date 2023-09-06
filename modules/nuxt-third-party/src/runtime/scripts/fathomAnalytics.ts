import { defineThirdPartyScript } from '../util'
import type { ThirdPartyScriptOptions } from '../types'

export interface FathomOptions {
  site?: string
  src?: string
  spa?: 'auto' | 'history' | 'hash'
  auto?: boolean
  canonical?: boolean
  excludedDomains?: string[]
  honorDnt?: boolean
  // TODO full config
}

export interface FathomAnalyticsApi {
  trackPageview: (ctx?: { url: string; referrer?: string }) => void
  trackGoal: (eventName: string, eventValue: number) => void
  // TODO full API
}

declare global {
  interface Window {
    fathom: FathomAnalyticsApi
  }
}

export const FathomAnalytics = defineThirdPartyScript<FathomOptions, FathomAnalyticsApi>({
  setup(options) {
    const src = options.src || 'https://cdn.usefathom.com/script.js'
    return {
      key: 'fathom-analytics',
      use: () =>  window.fathom,
      script: {
        src,
        'defer': true,
        'data-site': options.site!,
      },
      // TODO implement full options API
    }
  },
})

export function useFathomAnalytics(options?: FathomOptions, scriptOptions?: ThirdPartyScriptOptions) {
  // TODO reactivity
  return FathomAnalytics(options, scriptOptions)
}
