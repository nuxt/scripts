import type { GTag, GoogleAnalyticsApi } from 'third-party-capital'
import { GoogleAnalytics } from 'third-party-capital'
import type { GoogleAnalyticsInput } from '../../src/runtime/registry/google-analytics'
import { GoogleAnalyticsOptions } from '../../src/runtime/registry/google-analytics'
import { useRegistryScript } from '#nuxt-scripts-utils'

export function useScriptGoogleAnalyticsTpc<T extends GoogleAnalyticsApi>(_options?: GoogleAnalyticsInput) {
  // Note: inputs.useScriptInput is not usable, needs to be normalized
  return useRegistryScript<T, typeof GoogleAnalyticsOptions>('googleAnalytics', (options) => {
    const output = GoogleAnalytics(_options!)
    return {
      scriptInput: {
        src: output.scripts![0]!.url,
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
            gtag('config', options?.id)
            w.gtag = gtag
          },
    }
  }, _options)
}
