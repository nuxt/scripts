import type { Input } from 'valibot'
import { array, object, optional, string } from 'valibot'
import type google from 'google.maps'
import { withQuery } from 'ufo'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'
import { useScript, validateScriptInputSchema } from '#imports'

export const GoogleMapsOptions = object({
  apiKey: string(),
  libraries: optional(array(string())),
})

export type GoogleMapsInput = ScriptDynamicSrcInput<typeof GoogleMapsOptions>

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
export function useScriptGoogleMaps<T extends GoogleMapsApi>(options?: Input<typeof GoogleMapsOptions>, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(GoogleMapsOptions, options)
  }
  const libraries = options?.libraries || ['places']
  return useScript<GoogleMapsApi>({
    key: 'googleMaps',
    src: withQuery(`https://maps.googleapis.com/maps/api/js`, {
      libraries: libraries.join(','),
      key: options?.apiKey,
    }),
  }, {
    ...scriptOptions,
    use: () => ({ maps: window.google.maps }),
  })
}
