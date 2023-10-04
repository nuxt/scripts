import { useScript } from '#imports'

export interface CloudflareAnalyticsOptions {
  token: string
}

export interface CloudflareAnalyticsApi {
  __cfBeacon: {
    load: 'single'
    spa: boolean
    token: string
  }
  __cfRl?: {}
}

declare global {
  interface Window extends CloudflareAnalyticsApi {

  }
}

export function useCloudflareAnalytics(options: CloudflareAnalyticsOptions) {
  // TODO handle worker
  return useScript<CloudflareAnalyticsApi>({
    'key': 'cloudflare-analytics',
    'defer': true,
    'src': 'https://static.cloudflareinsights.com/beacon.min.js',
    'data-cf-beacon': JSON.stringify({ token: options.token, spa: true }),
  }, {
    use: () => ({ __cfBeacon: window.__cfBeacon, __cfRl: window.__cfRl }),
  })
}
