import { defu } from 'defu'
import { registryScript } from '../utils'
import { boolean, minLength, object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

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

export const CloudflareWebAnalyticsOptions = object({
  /**
   * The Cloudflare Web Analytics token.
   */
  token: string([minLength(32)]),
  /**
   * Cloudflare Web Analytics enables measuring SPAs automatically by overriding the History API’s pushState function
   * and listening to the onpopstate. Hash-based router is not supported.
   *
   * @default true
   */
  spa: optional(boolean()),
})

export type CloudflareWebAnalyticsInput = RegistryScriptInput<typeof CloudflareWebAnalyticsOptions>

export function useScriptCloudflareWebAnalytics<T extends CloudflareWebAnalyticsApi>(_options?: CloudflareWebAnalyticsInput) {
  return registryScript<T, typeof CloudflareWebAnalyticsOptions>('cloudflareWebAnalytics', options => ({
    scriptInput: {
      'src': 'https://static.cloudflareinsights.com/beacon.min.js',
      'data-cf-beacon': JSON.stringify(defu(options, { spa: true })),
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
