/// <reference types="google.maps" />
import { useScript } from '@unhead/vue'
import type { ThirdPartyScriptOptions } from '../types'

// import { useScript } from '#imports'

export interface GoogleMapsLoaderOptions {
  apiKey: string
  libraries?: string[]
}

export interface GoogleMapsLoaderApi {
  google: {
    maps: typeof google.maps
  }
}

declare global {
  interface Window extends GoogleMapsLoaderApi { }
}

/**
 * useGoogleMaps
 *
 * A 3P wrapper to load the Google Maps JavaScript api.
 *
 * @param options ThirdPartyScriptOptions
 * @returns ThirdPartyScriptApi
 */
export function useGoogleMaps(options: ThirdPartyScriptOptions<GoogleMapsLoaderOptions, GoogleMapsLoaderApi>) {
  return useScript<GoogleMapsLoaderApi>({
    key: 'google-maps-loader',
    async: true,
    src: `https://maps.googleapis.com/maps/api/js?libraries=places&key=${options.apiKey}&callback=&callback=Function.prototype`,

  }, {
    ...options,
    use: () => ({ google: window.google }),
  })
}
