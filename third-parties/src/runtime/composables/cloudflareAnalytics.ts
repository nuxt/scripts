import { useScript } from '#imports'
import type { NuxtUseTrackingScriptOptions } from '#nuxt-scripts'

export interface CloudflareAnalyticsApi {
  __cfBeacon: {
    load: 'single'
    spa: boolean
    token: string
  }
  __cfRl?: unknown
}

declare global {
  interface Window extends CloudflareAnalyticsApi {}
}

export function useCloudflareAnalytics<T extends CloudflareAnalyticsApi>(token?: string, options?: NuxtUseTrackingScriptOptions<T>) {
  return useScript<CloudflareAnalyticsApi>({
    'src': 'https://static.cloudflareinsights.com/beacon.min.js',
    'data-cf-beacon': JSON.stringify({ token, spa: true }),
    'trigger': 'idle',
  }, {
    ...options,
    assetStrategy: 'bundle',
    use() {
      return { __cfBeacon: window.__cfBeacon, __cfRl: window.__cfRl }
    },
  })
}
