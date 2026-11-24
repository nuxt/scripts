import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { MeasuremysiteAnalyticsOptions } from './schemas'

export { MeasuremysiteAnalyticsOptions }

export type MeasuremysiteAnalyticsInput = RegistryScriptInput<typeof MeasuremysiteAnalyticsOptions, false>

export interface MeasuremysiteAnalyticsApi {
  /**
   * Records a custom event.
   * @param name Event name, e.g. `signup`.
   * @param props Optional properties. Strings, numbers and booleans, up to 2 KB as JSON.
   * @see https://measuremy.site/docs/install
   */
  track: (name: string, props?: Record<string, string | number | boolean>) => void
}

declare global {
  interface Window {
    measuremysite: MeasuremysiteAnalyticsApi
  }
}

export function useScriptMeasuremysiteAnalytics<T extends MeasuremysiteAnalyticsApi>(_options?: MeasuremysiteAnalyticsInput) {
  return useRegistryScript<T, typeof MeasuremysiteAnalyticsOptions>('measuremysiteAnalytics', options => ({
    scriptInput: {
      'src': 'https://a.measuremy.site/t.js',
      'data-key': options.key,
      // The tracker posts to /collect on the origin it was served from.
      // Bundling serves it from the Nuxt origin, so the endpoint is pinned here.
      'data-api': 'https://a.measuremy.site/collect',
    },
    schema: import.meta.dev ? MeasuremysiteAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return window.measuremysite
      },
    },
  }), _options)
}
