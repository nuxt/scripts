import type { GoogleAnalyticsApi } from 'third-party-capital'
import { object, string } from 'valibot'
import { registryScript } from '../utils'
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
      src: 'https://www.googletagmanager.com/gtag/js',
    },
    schema: GoogleAnalyticsOptions,
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
