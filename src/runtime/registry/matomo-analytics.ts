import { type Input, boolean, object, optional, string } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions, NuxtUseScriptOptions } from '#nuxt-scripts'

export const MatomoAnalyticsOptions = object({
  matomoUrl: string(), // site is required
  siteId: string(),
  trackPageView: optional(boolean()),
  enableLinkTracking: optional(boolean()),
})

export type MatomoAnalyticsInput = Input<typeof MatomoAnalyticsOptions>

interface MatomoAnalyticsApi {
  _paq: MatomoAnalyticsApi
}

declare global {
  interface Window extends MatomoAnalyticsApi {}
}

export function useScriptMatomoAnalytics<T extends MatomoAnalyticsApi>(options?: MatomoAnalyticsInput, _scriptOptions?: Omit<NuxtUseScriptIntegrationOptions, 'assetStrategy'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(MatomoAnalyticsOptions, options)
    _scriptOptions?.beforeInit?.()
    if (import.meta.client) {
      const _paq = window._paq = window._paq || []
      options.trackPageView !== false && _paq.push(['trackPageView'])
      options?.enableLinkTracking !== false && _paq.push(['enableLinkTracking'])
      _paq.push(['setTrackerUrl', `//${matomoUrl}/matomo.php`])
      _paq.push(['setSiteId', options?.siteId])
    }
  }
  return useScript<MatomoAnalyticsApi>({
    src: `//${matomoUrl}/matomo.js`,
    ...options,
  }, {
    ...scriptOptions,
    use: () => window._paq,
  })
}
