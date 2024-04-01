import { object, optional, string } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

export const SegmentOptions = object({
  writeKey: string(),
  analyticsKey: optional(string()),
})

export type SegmentInput = ScriptDynamicSrcInput<typeof SegmentOptions>

export interface SegmentApi {
  analytics: {
    track: (event: string, properties?: Record<string, any>) => void
    page: (name?: string, properties?: Record<string, any>) => void
    identify: (userId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
    group: (groupId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
    alias: (userId: string, previousId: string, options?: Record<string, any>) => void
    reset: () => void
  }
}

declare global {
  interface Window extends SegmentApi {}
}

export function useScriptSegment<T extends SegmentApi>(options?: SegmentInput, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(SegmentOptions, options)
    if (import.meta.client) {
      window.analytics = window.analytics || []
      window.analytics.methods = ['track', 'page', 'identify', 'group', 'alias', 'reset']
      window.analytics.factory = function (method) {
        return function (...params: any[]) {
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
    }
  }
  const analyticsKey = options?.analyticsKey || 'analytics'
  return useScript<T>({
    'key': 'segment',
    'data-global-segment-analytics-key': analyticsKey,
    'src': options?.src || `https://cdn.segment.com/analytics.js/v1/${options?.writeKey}/analytics.min.js`,
  }, {
    ...scriptOptions,
    use() {
      // @ts-expect-error untyped
      return { analytics: window[analyticsKey] }
    },
  })
}
