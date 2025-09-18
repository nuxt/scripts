import { useRegistryScript } from '../utils'
import { object, optional, string, boolean, array, union, custom } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const UmamiAnalyticsOptions = object({
  websiteId: string(), // required
  /**
   * By default, Umami will send data to wherever the script is located.
   * You can override this to send data to another location.
   */
  hostUrl: optional(string()),
  /**
   * By default, Umami tracks all pageviews and events for you automatically.
   * You can disable this behavior and track events yourself using the tracker functions.
   * https://umami.is/docs/tracker-functions
   */
  autoTrack: optional(boolean()),
  /**
   * If you want the tracker to only run on specific domains, you can add them to your tracker script.
   * This is a comma delimited list of domain names.
   * Helps if you are working in a staging/development environment.
   */
  domains: optional(array(string())),
  /**
   * If you want the tracker to collect events under a specific tag.
   * Events can be filtered in the dashboard by a specific tag.
   */
  tag: optional(string()),
  /**
   * Function that will be called before data is sent to Umami.
   * The function takes two parameters: type and payload.
   * Return the payload to continue sending, or return a falsy value to cancel.
   */
  beforeSend: optional(union([
    custom<(type: string, payload: Record<string, any>) => Record<string, any> | null | false>(input => typeof input === 'function'),
    string(),
  ])),
})

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
