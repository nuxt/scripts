import type { GoogleAnalyticsApi } from 'third-party-capital'
import { registryScript } from '../utils'
import { GoogleAnalyticsScriptResolver } from '../../registry'
import { object, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

const GoogleAnalyticsOptions = object({
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
  return registryScript<T, typeof GoogleAnalyticsOptions>('googleAnalytics', options => ({
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
          window.dataLayer = window.dataLayer || []
          window.gtag = function gtag(...p) {
            window.dataLayer.push(p)
          }
          window.gtag('js', new Date())
          window.gtag('config', options?.id)
        },
  }), _options)
}
