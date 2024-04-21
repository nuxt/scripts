import { array, literal, object, optional, string, union } from 'valibot'
import type google from 'google.maps'
import { withQuery } from 'ufo'
import { registryScriptOptions } from '../utils'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'
import { useScript } from '#imports'

export const GoogleMapsOptions = object({
  apiKey: string(),
  libraries: optional(array(string())),
  v: optional(union([literal('weekly'), literal('beta'), literal('alpha')])),
})

export type GoogleMapsInput = ScriptDynamicSrcInput<typeof GoogleMapsOptions>

export interface GoogleMapsApi {
  maps: google.maps
}

declare global {
  interface Window {
    google: typeof google
  }
}

export function useScriptGoogleMaps<T extends GoogleMapsApi>(options?: GoogleMapsInput, scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const libraries = options?.libraries || ['places']
  let readyPromise: Promise<void> = Promise.resolve()
  return useScript<GoogleMapsApi>({
    key: 'googleMaps',
    async: true,
    src: withQuery(`https://maps.googleapis.com/maps/api/js`, {
      libraries: libraries.join(','),
      key: options?.apiKey,
      loading: 'async',
      callback: 'google.maps.__ib__',
    }),
  }, {
    ...registryScriptOptions({
      scriptOptions,
      schema: GoogleMapsOptions,
      options,
      clientInit: import.meta.server
        ? undefined
        : () => {
            window.google = window.google || {}
            window.google.maps = window.google.maps || {}
            readyPromise = new Promise((resolve) => {
              window.google.maps.__ib__ = resolve
            })
          },
    }),
    use() {
      return {
        maps: readyPromise.then(() => {
          return window.google.maps
        }),
      }
    }
  })
}
