import { withBase, withHttps } from 'ufo'
import { useRegistryScript } from '../utils'
import { boolean, object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const MatomoAnalyticsOptions = object({
  matomoUrl: string(), // site is required
  siteId: string(),
  trackPageView: optional(boolean()),
  enableLinkTracking: optional(boolean()),
})

export type MatomoAnalyticsInput = RegistryScriptInput<typeof MatomoAnalyticsOptions, false>

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
          options?.trackPageView !== false && _paq.push(['trackPageView'])
          options?.enableLinkTracking !== false && _paq.push(['enableLinkTracking'])
          _paq.push(['setTrackerUrl', withBase(`/matomo.php`, withHttps(options?.matomoUrl))])
          _paq.push(['setSiteId', options?.siteId || '1'])
        },
  }), _options)
}
