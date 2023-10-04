import type { UseScriptOptions } from '@unhead/schema'
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

export function useFathomAnalytics(options: FathomOptions, scriptOptions: Omit<UseScriptOptions<FathomOptions>, 'use'>) {
  const src = options.src || 'https://cdn.usefathom.com/script.js'
  return useScript<FathomAnalyticsApi>({
    'key': 'fathom',
    src,
    'defer': true,
    'data-site': options.site!,
  }, {
    use: () => window.fathom,
    ...scriptOptions,
  })
}
