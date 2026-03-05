import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { CloudflareWebAnalyticsOptions } from './schemas'

export { CloudflareWebAnalyticsOptions }

/**
 * Sample:
 * <!-- Cloudflare Web Analytics -->
 * <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "12ee46bf598b45c2868bbc07a3073f58"}'></script>
 * <!-- End Cloudflare Web Analytics -->
 */

export interface CloudflareWebAnalyticsApi {
  __cfBeacon: {
    load: 'single'
    spa: boolean
    token: string
  }
}

declare global {
  interface Window extends CloudflareWebAnalyticsApi {}
}

export type CloudflareWebAnalyticsInput = RegistryScriptInput<typeof CloudflareWebAnalyticsOptions>

export function useScriptCloudflareWebAnalytics<T extends CloudflareWebAnalyticsApi>(_options?: CloudflareWebAnalyticsInput) {
  return useRegistryScript<T, typeof CloudflareWebAnalyticsOptions>('cloudflareWebAnalytics', options => ({
    scriptInput: {
      'src': 'https://static.cloudflareinsights.com/beacon.min.js',
      'data-cf-beacon': JSON.stringify({ token: options.token, spa: options.spa || true }),
      'crossorigin': false,
    },
    schema: import.meta.dev ? CloudflareWebAnalyticsOptions : undefined,
    scriptOptions: {
      // we want to load earlier so that the web vitals reports are correct
      trigger: 'client',
      use() {
        return { __cfBeacon: window.__cfBeacon }
      },
    },
  }), _options)
}
