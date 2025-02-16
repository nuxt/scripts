import { withQuery } from 'ufo'
import type { GTag } from './google-analytics'
import { useRegistryScript } from '#nuxt-scripts/utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { object, string, optional } from '#nuxt-scripts-validator'

type DataLayer = Array<Parameters<GTag> | Record<string, unknown>>
interface GoogleTagManagerDataLayerApi {
  name: 'dataLayer'
  set: (opt: {
    [key: string]: string
  }) => void
  get: (key: string) => void
  reset: () => void
}
interface GoogleTagManagerDataLayerStatus {
  dataLayer: {
    gtmDom: boolean
    gtmLoad: boolean
    subscribers: number
  }
}
type GoogleTagManagerInstance = GoogleTagManagerDataLayerStatus & {
  [key: string]: {
    callback: () => void
    dataLayer: GoogleTagManagerDataLayerApi
  }
}
interface GoogleTagManagerApi {
  google_tag_manager: GoogleTagManagerInstance
  dataLayer: DataLayer
}

declare global {
  interface Window extends GoogleTagManagerApi {}
}
export const GoogleTagManagerOptions = object({
  id: string(),
  l: optional(string()),
})

export type GoogleTagManagerInput = RegistryScriptInput<typeof GoogleTagManagerOptions>

export function useScriptGoogleTagManager<T extends GoogleTagManagerApi>(_options?: GoogleTagManagerInput & { onBeforeGtmStart?: (dataLayer: DataLayer) => void }) {
  return useRegistryScript<T, typeof GoogleTagManagerOptions>(_options?.key || 'googleTagManager', options => ({
    scriptInput: {
      src: withQuery('https://www.googletagmanager.com/gtm.js', { id: options?.id, l: options?.l }),
    },
    schema: import.meta.dev ? GoogleTagManagerOptions : undefined,
    scriptOptions: {
      use: () => {
        return { dataLayer: (window as any)[options.l ?? 'dataLayer'] as DataLayer, google_tag_manager: window.google_tag_manager }
      },
      stub: import.meta.client ? undefined : ({ fn }) => { return fn === 'dataLayer' ? [] : void 0 },
      performanceMarkFeature: 'nuxt-third-parties-gtm',
      tagPriority: 1,
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const dataLayerName = options?.l ?? 'dataLayer';
          (window as any)[dataLayerName] = (window as any)[(options?.l ?? 'dataLayer')] || []
          _options?.onBeforeGtmStart?.((window as any)[dataLayerName])
          ;(window as any)[dataLayerName].push({ 'gtm.start': new Date().getTime(), 'event': 'gtm.js' })
        },
  }), _options)
}
