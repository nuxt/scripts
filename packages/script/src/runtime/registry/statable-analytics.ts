import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { StatableAnalyticsOptions } from './schemas'

export { StatableAnalyticsOptions }

export type StatableAnalyticsInput = RegistryScriptInput<typeof StatableAnalyticsOptions, false>

export interface StatableAnalyticsApi {
  /**
   * Records a custom event.
   * @param name Event name. Title Case by convention.
   * @param props Optional properties, merged into the event as `p.*`.
   * Strings, numbers and booleans index best in the dashboard.
   * @see https://statable.com/docs/developers/javascript-api/
   */
  t: (name: string, props?: Record<string, any>) => void
}

declare global {
  interface Window {
    statable: StatableAnalyticsApi
  }
}

const DEFAULT_HOST = 'https://statable.com'

export function useScriptStatableAnalytics<T extends StatableAnalyticsApi>(_options?: StatableAnalyticsInput) {
  return useRegistryScript<T, typeof StatableAnalyticsOptions>('statableAnalytics', (options) => {
    const host = (options.host || DEFAULT_HOST).replace(/\/+$/, '')
    return {
      scriptInput: {
        'src': `${host}/js/${options.siteId}/s.js`,
        // The tracker reads the site id from its own src path and posts to the
        // origin it was served from. Bundling serves the file from the Nuxt
        // origin, so both are pinned here and survive the rewrite.
        'data-id': options.siteId,
        'data-tracking-api': options.trackingApi || `${host}/api/event`,
        ...Object.fromEntries(
          Object.entries(options.props || {}).map(([key, value]) => [`data-statable-${key}`, value]),
        ),
      },
      schema: import.meta.dev ? StatableAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          return window.statable
        },
      },
    }
  }, _options)
}
