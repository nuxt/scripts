import type { Input } from 'valibot'
import { array, object, optional, string } from 'valibot'
import type google from 'google.maps'
import { withQuery } from 'ufo'
import { registryScriptOptions } from '../utils'
import type { NuxtUseScriptOptions, RegistryScriptInput } from '#nuxt-scripts'
import { useScript } from '#imports'

export const GoogleMapsOptions = object({
  apiKey: string(),
  libraries: optional(array(string())),
})

export type GoogleMapsInput = RegistryScriptInput<typeof GoogleMapsOptions>

export interface GoogleMapsApi {
  maps: google.maps.Map
}

declare global {
  interface Window extends GoogleMapsApi { }
}

/**
 * useScriptGoogleMaps
 *
 * A 3P wrapper to load the Google Maps JavaScript api.
 */
export function useScriptGoogleMaps<T extends GoogleMapsApi>(options?: Input<typeof GoogleMapsOptions>, scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const libraries = options?.libraries || ['places']
  return useScript<GoogleMapsApi>({
    key: 'googleMaps',
    src: withQuery(`https://maps.googleapis.com/maps/api/js`, {
      libraries: libraries.join(','),
      key: options?.apiKey,
    }),
  }, {
    ...registryScriptOptions({
      scriptOptions,
      schema: GoogleMapsOptions,
      options,
    }),
    use: () => ({ maps: window.google.maps }),
  })
}
