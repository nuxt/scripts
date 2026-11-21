import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { MetricRavenAnalyticsOptions } from './schemas'

export { MetricRavenAnalyticsOptions }

export type MetricRavenAnalyticsInput = RegistryScriptInput<typeof MetricRavenAnalyticsOptions, false>

export type MetricRavenPropValue = string | number | boolean

export interface MetricRavenTraits {
  name?: string
  email?: string
  /** An https:// profile picture URL. */
  image?: string
  [trait: string]: MetricRavenPropValue | null | undefined
}

export interface MetricRavenAnalyticsApi {
  /**
   * Records a custom event (a goal).
   * @param name Event name.
   * @param props Up to 10 properties: strings, numbers or booleans.
   * @see https://metricraven.com/docs/goals-funnels
   */
  track: (name: string, props?: Record<string, MetricRavenPropValue>) => void
  /**
   * Links this visitor to your user ID, with optional traits. Pass `{ token }` for a
   * signed identify made with a site secret key on your server.
   * @see https://metricraven.com/docs/identify-users
   */
  identify: ((userId: string | number, traits?: MetricRavenTraits, options?: { token?: string }) => boolean)
    & ((signed: { token: string }) => boolean)
  /**
   * Records a pageview. Needed only with `autoPageviews: false` or for virtual pages.
   * @param path A path on this origin. Defaults to the current URL.
   */
  pageview: (path?: string) => boolean
  /**
   * Credits a payment made with this email within the hour to this visitor, for
   * checkouts that can't carry the visitor ID.
   * @see https://metricraven.com/docs/attribute-by-email
   */
  payment: (claim: { email: string }) => boolean
  /** Grants or withdraws storage consent. */
  setConsent: (granted: boolean) => void
  /** Grants or withdraws advertising consent (ad clicks sent back with conversions). */
  setAdConsent: (granted: boolean) => void
  /** Starts a new visitor ID on logout (only when consent was granted). */
  reset: () => void
  /**
   * The current visitor ID. Pass it to your checkout to attribute revenue to the visit.
   * @see https://metricraven.com/docs/payments-api
   */
  getVisitorId: () => string | null
  /** The URL with cross-domain linking added, for links built in code. */
  linkUrl: (url: string) => string
  /** The cross-domain linking parameter (`{ mr_link }`), or `{}`. */
  linkParams: () => Record<string, string>
}

declare global {
  interface Window {
    metricraven: MetricRavenAnalyticsApi
    metricravenConsent?: boolean
  }
}

export const METRICRAVEN_DEFAULT_HOST = 'https://metricraven.com'

const ABSOLUTE_URL_RE = /^https?:\/\//i

/** Where the tracker loads from: `scriptUrl`, else `<apiHost>/js/script.js`. */
export function metricRavenScriptUrl(options: { apiHost?: string, scriptUrl?: string }): string {
  if (options.scriptUrl)
    return options.scriptUrl
  return `${(options.apiHost || METRICRAVEN_DEFAULT_HOST).replace(/\/+$/, '')}/js/script.js`
}

/**
 * The event endpoint and add-on base the tracker would derive from its own src.
 * Pinned on the tag so a bundled copy served from the Nuxt origin keeps them.
 * Relative script URLs are left to the tracker.
 */
function trackerDefaults(src: string): { endpoint?: string, addons?: string } {
  if (!ABSOLUTE_URL_RE.test(src))
    return {}
  const url = new URL(src)
  return {
    endpoint: new URL('/api/v1/collect', url).toString(),
    addons: url.pathname.endsWith('/js/script.js')
      ? new URL('addons/', url).toString()
      : `${METRICRAVEN_DEFAULT_HOST}/js/addons/`,
  }
}

export function useScriptMetricRavenAnalytics<T extends MetricRavenAnalyticsApi>(_options?: MetricRavenAnalyticsInput) {
  return useRegistryScript<T, typeof MetricRavenAnalyticsOptions>('metricravenAnalytics', (options, ctx) => {
    const src = metricRavenScriptUrl(options)
    // A `scriptInput.src` override replaces `src`, so derive the defaults from it.
    const defaults = trackerDefaults(ctx.scriptInput?.src || src)
    const hosts = (options.allowedHostnames || []).map(h => h.trim()).filter(Boolean)
    return {
      scriptInput: {
        'src': src,
        'data-site-id': options.siteId,
        'data-api': options.endpoint || defaults.endpoint,
        'data-addons': options.addonsUrl || defaults.addons,
        'data-auto-pageviews': options.autoPageviews === false ? 'false' : undefined,
        'data-track-hash': options.hashRouting === 'all' ? 'all' : options.hashRouting ? 'true' : undefined,
        'data-strip-query': options.stripQuery ? 'true' : undefined,
        'data-ad-consent': options.adConsent ? 'granted' : undefined,
        'data-domain': options.domain,
        // The tracker checks for the attribute's presence.
        'data-allow-localhost': options.allowLocalhost ? 'true' : undefined,
        'data-allowed-hostnames': hosts.length ? hosts.join(',') : undefined,
        'data-identity-token': options.identityToken,
        'data-autocapture': options.autocapture === false
          ? 'false'
          : Array.isArray(options.autocapture) ? (options.autocapture.join(',') || 'false') : undefined,
        'data-debug': options.debug ? 'true' : undefined,
      },
      schema: import.meta.dev ? MetricRavenAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          return window.metricraven
        },
      },
      clientInit: import.meta.server || !options.consent
        ? undefined
        : () => {
            // Read by the tracker when it starts.
            window.metricravenConsent = true
          },
    }
  }, _options)
}
