import { defineThirdPartyScript } from '../util'
import { useScript } from '#imports'

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

export interface FathomApi {
  trackPageview: (ctx?: { url: string; referrer?: string }) => void
  trackGoal: (eventName: string, eventValue: number) => void
  // TODO full API
}

declare global {
  interface Window {
    fathom: FathomApi
  }
}

export const FathomAnalytics = defineThirdPartyScript<FathomOptions, FathomApi>({
  setup(options) {
    const src = options.src || 'https://cdn.usefathom.com/script.js'
    return useScript<FathomApi>({
      key: 'fathom-analytics',
      use: () => typeof window !== 'undefined' ? window.fathom : undefined,
      script: {
        src,
        'defer': true,
        'data-site': options.site!,
      },
      // TODO implement full options API
    })
  },
})

export function useFathomAnalytics(options?: FathomOptions) {
  // TODO reactivity
  return FathomAnalytics(options)
}
