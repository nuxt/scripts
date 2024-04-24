import { array, literal, object, optional, string, union } from 'valibot'
import { registryScript } from '../utils'
import { PlausibleAnalyticsScriptResolver } from '../../registry'
import type { RegistryScriptInput } from '#nuxt-scripts'

const extensions = [
  literal('hash'),
  literal('outbound-links'),
  literal('file-downloads'),
  literal('tagged-events'),
  literal('revenue'),
  literal('pageview-props'),
  literal('compat'),
  literal('local'),
  literal('manual'),
]

export const PlausibleAnalyticsOptions = object({
  domain: string(), // required
  extension: optional(union([union(extensions), array(union(extensions))])),
})

export type PlausibleAnalyticsInput = RegistryScriptInput<typeof PlausibleAnalyticsOptions, false>

export interface PlausibleAnalyticsApi {
  plausible: ((event: '404', options: Record<string, any>) => void) &
  ((event: 'event', options: Record<string, any>) => void) &
  ((...params: any[]) => void) & {
    q: any[]
  }
}

declare global {
  interface Window {
    plausible: PlausibleAnalyticsApi
  }
}

export function useScriptPlausibleAnalytics<T extends PlausibleAnalyticsApi>(_options?: PlausibleAnalyticsInput) {
  return registryScript<T, typeof PlausibleAnalyticsOptions>('plausibleAnalytics', (options) => {
    return {
      scriptInput: {
        'src': PlausibleAnalyticsScriptResolver(options),
        'data-domain': options?.domain,
      },
      schema: PlausibleAnalyticsOptions,
      scriptOptions: {
        use() {
          return { plausible: window.plausible }
        },
      },
    }
  }, _options)
}
