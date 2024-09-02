import { withBase, withHttps } from 'ufo'
import { useRegistryScript } from '../utils'
import { boolean, object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const MatomoAnalyticsOptions = object({
  matomoUrl: optional(string()),
  siteId: optional(string()),
  trackerUrl: optional(string()),
  trackPageView: optional(boolean()),
  enableLinkTracking: optional(boolean()),
  disableCookies: optional(boolean()),
})

export type MatomoAnalyticsInput = RegistryScriptInput<typeof MatomoAnalyticsOptions, false, false, false>

interface MatomoAnalyticsApi {
  _paq: unknown[]
}

declare global {
  interface Window extends MatomoAnalyticsApi {}
}

export function useScriptMatomoAnalytics<T extends MatomoAnalyticsApi>(_options?: MatomoAnalyticsInput) {
  return useRegistryScript<T, typeof MatomoAnalyticsOptions>('matomoAnalytics', options => ({
    scriptInput: {
      src: withBase(`/matomo.js`, withHttps(options?.matomoUrl)),
      crossorigin: false,
    },
    schema: import.meta.dev ? MatomoAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return { _paq: window._paq }
      },
      // allow _paq to be accessed on the server
      stub: import.meta.client
        ? undefined
        : ({ fn }) => {
            return fn === '_paq' ? [] : undefined
          },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const _paq = window._paq = window._paq || []
          if (options?.trackPageView) {
            _paq.push(['trackPageView'])
          }
          if (options?.enableLinkTracking) {
            _paq.push(['enableLinkTracking'])
          }

          if (options?.disableCookies) {
            _paq.push(['disableCookies'])
          }

          if(options?.trackerUrl || options?.matomoUrl) {
            _paq.push(['setTrackerUrl', withHttps(options.trackerUrl) ?? withBase(`/matomo.php`, withHttps(options.matomoUrl))])
          }

          if(options?.siteId) {
            _paq.push(['setSiteId', options?.siteId])
          }
        },
  }), _options)
}
