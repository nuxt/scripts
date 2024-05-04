import { useRegistryScript } from '../utils'
import { SegmentScriptResolver } from '../../registry'
import { object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const SegmentOptions = object({
  writeKey: string(),
  analyticsKey: optional(string()),
})

export type SegmentInput = RegistryScriptInput<typeof SegmentOptions>

interface AnalyticsApi {
  track: (event: string, properties?: Record<string, any>) => void
  page: (name?: string, properties?: Record<string, any>) => void
  identify: (userId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
  group: (groupId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
  alias: (userId: string, previousId: string, options?: Record<string, any>) => void
  reset: () => void
  /**
   * @internal
   */
  methods: string[]
  /**
   * @internal
   */
  factory: (method: string) => (...args: any[]) => AnalyticsApi
  /**
   * @internal
   */
  push: (args: any[]) => void
}

export interface SegmentApi {
  analytics: AnalyticsApi & { [key: string]: (...args: any[]) => AnalyticsApi }
}

declare global {
  interface Window extends SegmentApi { }
}

export function useScriptSegment<T extends SegmentApi>(_options?: SegmentInput) {
  return useRegistryScript<T, typeof SegmentOptions>('segment', (options) => {
    const analyticsKey: string = options?.analyticsKey ?? 'analytics'
    return {
      scriptInput: {
        'data-global-segment-analytics-key': analyticsKey,
        'src': SegmentScriptResolver(options),
      },
      schema: import.meta.dev ? SegmentOptions : undefined,
      scriptOptions: {
        use() {
          // @ts-expect-error untyped
          return { analytics: window[analyticsKey] as SegmentApi['analytics'] }
        },
        clientInit: import.meta.server
          ? undefined
          : () => {
              window.analytics = window.analytics || []
              window.analytics.methods = ['track', 'page', 'identify', 'group', 'alias', 'reset']
              window.analytics.factory = function (method) {
                return function (...params) {
                  const args = Array.prototype.slice.call(params)
                  args.unshift(method)
                  window.analytics.push(args)
                  return window.analytics
                }
              }
              for (let i = 0; i < window.analytics.methods.length; i++) {
                const key = window.analytics.methods[i]
                window.analytics[key] = window.analytics.factory(key)
              }
              window.analytics.page()
            },
      },
    }
  }, _options)
}
