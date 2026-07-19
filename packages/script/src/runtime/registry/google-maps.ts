import type { RegistryScriptInput } from '#nuxt-scripts/types'
/// <reference types="google.maps" />
import { withQuery } from 'ufo'
import { useRegistryScript } from '../utils'
import { GoogleMapsOptions } from './schemas'

export { GoogleMapsOptions }

export type GoogleMapsInput = RegistryScriptInput<typeof GoogleMapsOptions>

type MapsNamespace = typeof google.maps
type GoogleMapsWindow = Window & {
  google: {
    maps: MapsNamespace & { __ib__?: () => void }
  }
}
export interface GoogleMapsApi {
  maps: MapsNamespace
}

export function useScriptGoogleMaps<T extends GoogleMapsApi>(_options?: GoogleMapsInput) {
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
            const runtimeWindow = window as unknown as Partial<GoogleMapsWindow>
            runtimeWindow.google = runtimeWindow.google || {} as GoogleMapsWindow['google']
            runtimeWindow.google.maps = runtimeWindow.google.maps || {} as GoogleMapsWindow['google']['maps']
          },
      schema: import.meta.dev ? GoogleMapsOptions : undefined,
      scriptOptions: {
        resolve({ waitFor }) {
          const maps = (window as unknown as GoogleMapsWindow).google.maps
          if (typeof maps.importLibrary === 'function')
            return { maps } as unknown as T

          return waitFor<T>((resolve) => {
            const previousReady = maps.__ib__
            let onReady: () => void
            const restoreReady = () => {
              if (maps.__ib__ !== onReady)
                return
              if (previousReady)
                maps.__ib__ = previousReady
              else
                Reflect.deleteProperty(maps, '__ib__')
            }
            onReady = () => {
              restoreReady()
              try {
                previousReady?.()
              }
              catch (error) {
                if (import.meta.dev)
                  console.error('[nuxt-scripts] Previous google.maps.__ib__ handler failed:', error)
              }
              resolve({ maps } as unknown as T)
            }
            maps.__ib__ = onReady
            return restoreReady
          })
        },
      },
    }
  }, _options)
}
