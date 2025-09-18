/// <reference types="google.maps" />
import { withQuery } from 'ufo'
import { useRegistryScript } from '../utils'
import { array, literal, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

// eslint-disable-next-line
declare namespace google {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
  language: optional(string()),
  region: optional(string()),
  v: optional(union([literal('weekly'), literal('quarterly'), literal('beta'), literal('alpha'), string()])),
})

export type GoogleMapsInput = RegistryScriptInput<typeof GoogleMapsOptions>

type MapsNamespace = typeof window.google.maps
export interface GoogleMapsApi {
  maps: Promise<MapsNamespace>
}

declare global {
  interface Window {
    google: {
      maps: {
        __ib__(): void
      }
    }
  }
}

export function useScriptGoogleMaps<T extends GoogleMapsApi>(_options?: GoogleMapsInput) {
  let readyPromise: Promise<void> = Promise.resolve()
  return useRegistryScript<T, typeof GoogleMapsOptions>('googleMaps', (options) => {
    const libraries = options?.libraries || ['places']
    const language = options?.language ? { language: options.language } : undefined
    const region = options?.region ? { region: options.region } : undefined
    const version = options?.v ? { v: options.v } : undefined
    return {
      scriptInput: {
        src: withQuery(`https://maps.googleapis.com/maps/api/js`, {
          libraries: libraries.join(','),
          key: options?.apiKey,
          loading: 'async',
          callback: 'google.maps.__ib__',
          ...language,
          ...region,
          ...version,
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
            maps: readyPromise!.then(() => window.google.maps),
          }
        },
      },
    }
  }, _options)
}
