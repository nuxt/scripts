/// <reference types="google.maps" />
import { withQuery } from 'ufo'
import { useRegistryScript } from '../utils'
import { array, literal, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

// eslint-disable-next-line ts/no-namespace
declare namespace google {
  // eslint-disable-next-line ts/no-namespace
  export namespace maps {

    /**
     * @internal
     */
    export function __ib__(): void
  }
}

export const GoogleMapsOptions = object({
  apiKey: string(),
  libraries: optional(array(string())),
  v: optional(union([literal('weekly'), literal('beta'), literal('alpha')])),
})

export type GoogleMapsInput = RegistryScriptInput<typeof GoogleMapsOptions>

export interface GoogleMapsApi {
  maps: typeof google.maps
}

declare global {
  interface Window {
    google: typeof google
  }
}

export function useScriptGoogleMaps<T extends GoogleMapsApi>(_options?: GoogleMapsInput) {
  let readyPromise: Promise<void> = Promise.resolve()
  return useRegistryScript<T, typeof GoogleMapsOptions>('googleMaps', (options) => {
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
      schema: import.meta.dev ? GoogleMapsOptions : undefined,
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
