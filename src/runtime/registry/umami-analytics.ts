import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { UmamiAnalyticsOptions } from './schemas'

export { UmamiAnalyticsOptions }

export type UmamiAnalyticsInput = RegistryScriptInput<typeof UmamiAnalyticsOptions, false>

export interface UmamiAnalyticsApi {
  track: ((payload?: Record<string, any>) => void) & ((event_name: string, event_data: Record<string, any>) => void)
  identify: (session_data?: Record<string, any> | string) => void
}

declare global {
  interface Window {
    umami: UmamiAnalyticsApi
  }
}

export function useScriptUmamiAnalytics<T extends UmamiAnalyticsApi>(_options?: UmamiAnalyticsInput) {
  return useRegistryScript<T, typeof UmamiAnalyticsOptions>('umamiAnalytics', (options) => {
    const domains = Array.isArray(options?.domains) ? options.domains.join(',') : options?.domains

    let beforeSendFunctionName: string | undefined
    if (import.meta.client) {
      // Handle beforeSend function
      if (options?.beforeSend && typeof options.beforeSend === 'function') {
        // Generate a random function name
        beforeSendFunctionName = `__umamiBeforeSend_${Math.random().toString(36).substring(2, 15)}`
        // Add function to window global scope
        ;(window as any)[beforeSendFunctionName] = options.beforeSend
      }
      else if (typeof options.beforeSend === 'string') {
        // If it's a string, assume it's a function name already defined in the global scope
        beforeSendFunctionName = options.beforeSend
      }
    }
    return {
      scriptInput: {
        'src': 'https://cloud.umami.is/script.js',
        'data-website-id': options.websiteId,
        'data-host-url': options?.hostUrl || undefined,
        'data-auto-track': typeof options?.autoTrack === 'boolean' ? options.autoTrack : true,
        'data-domains': domains || undefined,
        'data-tag': options?.tag || undefined,
        'data-before-send': beforeSendFunctionName || undefined,
      },
      schema: import.meta.dev ? UmamiAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          return window.umami
        },
      },
    }
  }, _options)
}
