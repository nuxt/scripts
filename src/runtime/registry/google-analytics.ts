import type { GTag, GoogleAnalyticsApi } from 'third-party-capital'
import { useRegistryScript } from '../utils'
import { GoogleAnalyticsScriptResolver } from '../../registry'
import { object, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const GoogleAnalyticsOptions = object({
  /**
   * The Google Analytics ID.
   */
  id: string(),
})

export type GoogleAnalyticsInput = RegistryScriptInput<typeof GoogleAnalyticsOptions>

declare global {
  interface Window extends GoogleAnalyticsApi { }
}

/**
 * useScriptGoogleAnalytics
 *
 * A 3P wrapper for Google Analytics that takes an options input to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns instructions for nuxt-scripts.
 */
export function useScriptGoogleAnalytics<T extends GoogleAnalyticsApi>(_options?: GoogleAnalyticsInput) {
  // Note: inputs.useScriptInput is not usable, needs to be normalized
  return useRegistryScript<T, typeof GoogleAnalyticsOptions>('googleAnalytics', options => ({
    scriptInput: {
      src: GoogleAnalyticsScriptResolver(options),
    },
    schema: import.meta.dev ? GoogleAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return { dataLayer: window.dataLayer, gtag: window.gtag }
      },
      // allow dataLayer to be accessed on the server
      stub: import.meta.client
        ? undefined
        : ({ fn }) => {
            return fn === 'dataLayer' ? [] : undefined
          },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const w = window
          w.dataLayer = w.dataLayer || []
          const gtag: GTag = function () {
            // eslint-disable-next-line prefer-rest-params
            w.dataLayer.push(arguments)
          }
          gtag('js', new Date())
          gtag('config', 'G-TR58L0EF8P')
          w.gtag = gtag
        },
  }), _options)
}
