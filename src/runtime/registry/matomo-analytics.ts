import { withBase, withHttps, withoutProtocol, withoutTrailingSlash } from 'ufo'
import { useRegistryScript } from '../utils'
import { useScriptEventPage } from '../composables/useScriptEventPage'
import { boolean, object, optional, string, number, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { logger } from '../logger'

export const MatomoAnalyticsOptions = object({
  matomoUrl: optional(string()),
  siteId: optional(union([string(), number()])),
  cloudId: optional(string()),
  trackerUrl: optional(string()),
  trackPageView: optional(boolean()),
  enableLinkTracking: optional(boolean()),
  disableCookies: optional(boolean()),
  watch: optional(boolean()),
})

export type MatomoAnalyticsInput = RegistryScriptInput<typeof MatomoAnalyticsOptions, false, false, false>

interface MatomoAnalyticsApi {
  _paq: unknown[]
}

declare global {
  interface Window extends MatomoAnalyticsApi { }
}

export function useScriptMatomoAnalytics<T extends MatomoAnalyticsApi>(_options?: MatomoAnalyticsInput) {
  return useRegistryScript<T, typeof MatomoAnalyticsOptions>('matomoAnalytics', (options) => {
    const normalizedCloudId = options?.cloudId ? withoutTrailingSlash(withoutProtocol(options.cloudId)) : undefined
    const origin = options?.matomoUrl ? options.matomoUrl : `https://cdn.matomo.cloud/${normalizedCloudId}/`
    const _paq = import.meta.client ? (window._paq = window._paq || []) : []
    return {
      scriptInput: {
        src: withBase(`/matomo.js`, origin),
        crossorigin: false,
      },
      schema: import.meta.dev ? MatomoAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          // Ensure _paq is always available as a queue, even before script loads
          const _paqProxy = {
            push: (...args: any[]) => {
              // If _paq exists and has push method, use it directly
              if (window._paq && typeof window._paq.push === 'function') {
                return window._paq.push(...args)
              }
              // Otherwise, ensure _paq is initialized as an array and push to it
              window._paq = window._paq || []
              return window._paq.push(...args)
            },
          }

          return { _paq: _paqProxy }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            if (options?.enableLinkTracking) {
              _paq.push(['enableLinkTracking'])
            }
            if (options?.disableCookies) {
              _paq.push(['disableCookies'])
            }
            if (options?.trackerUrl || options?.matomoUrl) {
              _paq.push(['setTrackerUrl', options?.trackerUrl ?? withBase(`/matomo.php`, options?.matomoUrl || '')])
            }
            else if (normalizedCloudId) {
              _paq.push(['setTrackerUrl', withBase(`/matomo.php`, withHttps(normalizedCloudId))])
            }
            _paq.push(['setSiteId', String(options?.siteId) || '1'])
            // Deprecated: trackPageView option
            if (options?.trackPageView !== undefined) {
              if (import.meta.dev) {
                logger.warn('The `trackPageView` option is deprecated. Use `watch: true` (default) for automatic page view tracking, or remove this option entirely.')
              }
              if (options.trackPageView) {
                _paq.push(['trackPageView'])
              }
            }
            else if (options?.watch !== false) {
              useScriptEventPage((payload) => {
                window._paq.push(['setDocumentTitle', payload.title])
                window._paq.push(['setCustomUrl', payload.path])
                window._paq.push(['trackPageView'])
              })
            }
          },
    }
  }, _options)
}
