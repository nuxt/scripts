import { withQuery } from 'ufo'
import { useRegistryScript } from '#nuxt-scripts/utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { object, string, optional } from '#nuxt-scripts-validator'

type ConsentOptions = 'default' | 'update'

export interface GTag {
  (fn: 'js', opt: Date): void
  (fn: 'config' | 'get', opt: string): void
  (fn: 'event', opt: string, opt2?: Record<string, any>): void
  (fn: 'set', opt: Record<string, string>): void
  (fn: 'consent', opt: ConsentOptions, opt2: Record<string, string>): void
}
type DataLayer = Array<Parameters<GTag> | Record<string, unknown>>

export const GoogleAnalyticsOptions = object({
  id: string(),
  l: optional(string()),
})

export type GoogleAnalyticsInput = RegistryScriptInput<typeof GoogleAnalyticsOptions>

export interface GoogleAnalyticsApi {
  gtag: GTag
  dataLayer: DataLayer
}

export function useScriptGoogleAnalytics<T extends GoogleAnalyticsApi>(_options?: GoogleAnalyticsInput) {
  return useRegistryScript<T, typeof GoogleAnalyticsOptions>(_options?.key || 'googleAnalytics', options => ({
    scriptInput: {
      src: withQuery('https://www.googletagmanager.com/gtag/js', { id: options?.id, l: options?.l }),
    },
    schema: import.meta.dev ? GoogleAnalyticsOptions : undefined,
    scriptOptions: {
      use: () => {
        const gtag: GTag = function (...args: Parameters<GTag>) {
          ((window as any)['gtag-' + (options.l ?? 'dataLayer')] as GTag)(...args)
        } as GTag
        return {
          dataLayer: (window as any)[options.l ?? 'dataLayer'] as DataLayer,
          gtag,
        }
      },
      stub: import.meta.client ? undefined : ({ fn }) => { return fn === 'dataLayer' ? [] : void 0 },
      performanceMarkFeature: 'nuxt-third-parties-ga',
      tagPriority: 1,
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const dataLayerName = options?.l ?? 'dataLayer'
          const dataLayer = (window as any)[dataLayerName] || [];

          (window as any)[dataLayerName] = dataLayer
          // eslint-disable-next-line
          // @ts-ignore
          window['gtag-' + (dataLayerName)] = function () {
            // eslint-disable-next-line
            (window as any)[dataLayerName].push(arguments)
          }
          ; ((window as any)['gtag-' + (dataLayerName)] as GTag)('js', new Date())
          ; ((window as any)['gtag-' + (dataLayerName)] as GTag)('config', (options?.id))
        },
  }), _options)
}
