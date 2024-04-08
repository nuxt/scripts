import { type Input, boolean, minLength, object, optional, string } from 'valibot'
import { defu } from 'defu'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions, NuxtUseScriptOptions } from '#nuxt-scripts'

export interface CloudflareWebAnalyticsApi {
  __cfBeacon: {
    load: 'single'
    spa: boolean
    token: string
  }
  __cfRl?: unknown
}

declare global {
  interface Window extends CloudflareWebAnalyticsApi {}
}

// Create login schema with email and password
export const CloudflareWebAnalyticsOptions = object({
  /**
   * The Cloudflare Web Analytics token.
   *
   * Required when used for the first time.
   */
  token: string([minLength(33)]),
  /**
   * Cloudflare Web Analytics enables measuring SPAs automatically by overriding the History API’s pushState function
   * and listening to the onpopstate. Hash-based router is not supported.
   *
   * @default true
   */
  spa: optional(boolean()),
})

export type CloudflareWebAnalyticsInput = Input<typeof CloudflareWebAnalyticsOptions>

export function useScriptCloudflareWebAnalytics<T extends CloudflareWebAnalyticsApi>(options?: CloudflareWebAnalyticsInput, _scriptOptions?: NuxtUseScriptIntegrationOptions) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(CloudflareWebAnalyticsOptions, options)
    _scriptOptions?.beforeInit?.()
  }
  return useScript<CloudflareWebAnalyticsApi>({
    'src': 'https://static.cloudflareinsights.com/beacon.min.js',
    'data-cf-beacon': JSON.stringify(defu(options, { spa: true })),
  }, {
    ...scriptOptions,
    use() {
      return { __cfBeacon: window.__cfBeacon, __cfRl: window.__cfRl }
    },
  })
}
