import { boolean, object, optional, string } from 'valibot'
import { registryScript } from '../utils'
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
  return registryScript<T, typeof MatomoAnalyticsOptions>('matomoAnalytics', options => ({
    scriptInput: {
      src: `https://${options?.matomoUrl}/matomo.js`,
    },
    schema: MatomoAnalyticsOptions,
    scriptOptions: {
      use() {
        return { _paq: window._paq }
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            const _paq = window._paq = window._paq || []
            options?.trackPageView !== false && _paq.push(['trackPageView'])
            options?.enableLinkTracking !== false && _paq.push(['enableLinkTracking'])
            _paq.push(['setTrackerUrl', `//${options?.matomoUrl}/matomo.php`])
            _paq.push(['setSiteId', options?.siteId])
          },
    },
  }), _options)
}
