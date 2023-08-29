import { defineThirdParty } from '../util'
import { useScript } from '#imports'

export interface FathomOptions {
  site: string
  src?: string
  spa?: 'auto' | 'history' | 'hash'
  auto?: boolean
  canonical?: boolean
  excludedDomains?: string[]
}

export interface FathomApi {
  trackPageview: (ctx?: { url: string; referrer: string }) => void
  trackGoal: (eventName: string, eventValue: number) => void
}

export const FathomAnalytics = defineThirdParty<FathomOptions>((options, ctx) => {
  const src = options.src || 'https://cdn.usefathom.com/tracker.js'
  return useScript({
    src,
    'data-site': options.site,
    'defer': true,
    'mode': ctx.global ? 'server' : 'all',
    // TODO other data-* fields
  })
})

export async function useFathomAnalytics(options: FathomOptions) {
  // setup
  await FathomAnalytics(options, { global: false, webworker: false }).waitForLoad()
  // use global
  return window.fathom as FathomApi
}
