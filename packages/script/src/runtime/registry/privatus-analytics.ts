import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { PrivatusAnalyticsOptions } from './schemas'

export { PrivatusAnalyticsOptions }

export type PrivatusAnalyticsInput = RegistryScriptInput<typeof PrivatusAnalyticsOptions, false>

export type PrivatusAnalyticsProps = Record<string, string | number | boolean | string[] | null | undefined>

export interface PrivatusAnalyticsApi {
  /**
   * Records a custom event.
   * @param name Event name, for example `Signup`.
   * @param props Optional properties. `revenue` and `currency` record revenue.
   * @param callback Called once the event is sent, or skipped.
   * @see https://privatusanalytics.com/docs
   */
  track: (name: string, props?: PrivatusAnalyticsProps, callback?: () => void) => void
  /** Sends a page view for the current URL. Useful with `manual: true`. */
  pageview: (options?: { props?: PrivatusAnalyticsProps }) => void
  /** Sets properties sent with every following hit on this page load. */
  props: (props: PrivatusAnalyticsProps) => void
  /** Stops tracking in this browser. The visitor's choice is kept by the tracker. */
  optOut: () => void
  /** Undoes `optOut()`. */
  optIn: () => void
  isOptedOut: () => boolean
}

declare global {
  interface Window {
    privatus: PrivatusAnalyticsApi
  }
}

const DEFAULT_API = 'https://privatusstats.com'

function list(values?: string[]) {
  const joined = (values || []).map(value => value.trim()).filter(Boolean).join(',')
  return joined || undefined
}

export function useScriptPrivatusAnalytics<T extends PrivatusAnalyticsApi>(_options?: PrivatusAnalyticsInput) {
  return useRegistryScript<T, typeof PrivatusAnalyticsOptions>('privatusAnalytics', (options) => {
    const api = (options.api || DEFAULT_API).replace(/\/+$/, '')
    return {
      scriptInput: {
        'src': `${api}/js/pa.js`,
        'data-site': options.site,
        // The tracker posts to `data-api` and loads its modules from there,
        // falling back to the origin it was served from. Bundling serves the
        // file from the Nuxt origin, so the API origin is always pinned.
        'data-api': api,
        // An empty `data-modules` switches every module off, so only render it when set.
        'data-modules': options.modules ? options.modules.join(',') : undefined,
        'data-spa': options.spa,
        'data-manual': options.manual ? 'true' : undefined,
        'data-domains': list(options.domains),
        'data-exclude': list(options.exclude),
        'data-hash': options.hash ? 'true' : undefined,
      },
      schema: import.meta.dev ? PrivatusAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          return window.privatus
        },
      },
    }
  }, _options)
}
