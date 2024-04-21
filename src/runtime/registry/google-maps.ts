import { array, literal, object, optional, string, union } from 'valibot'
import type google from 'google.maps'
import { withQuery } from 'ufo'
import { registryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const GoogleMapsOptions = object({
  apiKey: string(),
  libraries: optional(array(string())),
  v: optional(union([literal('weekly'), literal('beta'), literal('alpha')])),
})

export type GoogleMapsInput = RegistryScriptInput<typeof GoogleMapsOptions>

export interface GoogleMapsApi {
  maps: google.maps
}

declare global {
  interface Window {
    google: typeof google
  }
}

export function useScriptGoogleMaps<T extends GoogleMapsApi>(_options?: GoogleMapsInput) {
  let readyPromise: Promise<void> = Promise.resolve()
  return registryScript<T, typeof GoogleMapsOptions>('googleMaps', (options) => {
    const libraries = options?.libraries || ['places']
    return {
      scriptInput: {
        src: withQuery(`https://maps.googleapis.com/maps/api/js`, {
          libraries: libraries.join(','),
          key: options?.apiKey,
          loading: 'async',
          callback: 'google.maps.__ib__',
        }),
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            window.google = window.google || {}
            window.google.maps = window.google.maps || {}
            readyPromise = new Promise((resolve) => {
              window.google.maps.__ib__ = resolve
            })
          },
      schema: GoogleMapsOptions,
      scriptOptions: {
        use() {
          return {
            maps: readyPromise.then(() => {
              return window.google.maps
            }),
          }
        },
      },
    }
  }, _options)
}
