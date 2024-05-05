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

export interface SegmentApi extends Pick<AnalyticsApi, 'track' | 'page' | 'identify' | 'group' | 'alias' | 'reset'> {
}

declare global {
  interface Window extends SegmentApi { }
}

const methods = ['track', 'page', 'identify', 'group', 'alias', 'reset']

export function useScriptSegment<T extends SegmentApi>(_options?: SegmentInput) {
  return useRegistryScript<T, typeof SegmentOptions>('segment', (options) => {
    const k = (options?.analyticsKey ?? 'analytics') as keyof Window
    return {
      scriptInput: {
        'data-global-segment-analytics-key': k,
        'src': SegmentScriptResolver(options),
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
          // @ts-expect-error untyped
            window[k] = window[k] || []
            window[k].methods = methods
            window[k].factory = function (method: string) {
              return function (...params: any[]) {
                const args = Array.prototype.slice.call(params)
                args.unshift(method)
                window[k].push(args)
                return window[k]
              }
            }
            for (let i = 0; i < window[k].methods.length; i++) {
              const key = window[k].methods[i]
              window[k][key] = window[k].factory(key)
            }
            window[k].page()
          },
      schema: import.meta.dev ? SegmentOptions : undefined,
      scriptOptions: {
        stub: import.meta.server
          // ensure ssr works
          ? ({ fn }) => {
              if (fn === 'analytics') {
                return {
                  track: () => {},
                  page: () => {},
                  identify: () => {},
                  group: () => {},
                  alias: () => {},
                  reset: () => {},
                }
              }
            }
          : undefined,
        use() {
          return methods.reduce((acc, key) => {
            // @ts-expect-error untyped
            acc[key] = window[k].factory(key) as SegmentApi['analytics']
            return acc
          }, {})
        },
      },
    }
  }, _options)
}
