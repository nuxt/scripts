import type * as MapLibre from 'maplibre-gl'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { configureMapLibreWorker, ensureMapLibreStyles } from '../maplibre-styles'
import { useRegistryScript } from '../utils'
import { MapLibreOptions } from './schemas'

export { MapLibreOptions }

export type MapLibreInput = RegistryScriptInput<typeof MapLibreOptions>

export interface MapLibreApi {
  maplibregl: typeof MapLibre
}

declare global {
  interface Window {
    maplibregl?: typeof MapLibre
  }
}

/**
 * MapLibre GL JS v6 is an ESM-only distribution. It has no UMD build, and its
 * worker resolves against `import.meta.url`, so it is loaded from the
 * `maplibre-gl` package instead of a CDN script tag.
 */
export function useScriptMapLibre<T extends MapLibreApi>(_options?: MapLibreInput) {
  return useRegistryScript<T, typeof MapLibreOptions>('maplibre', (options) => {
    const injectStyles = options?.injectStyles !== false
    const stylesheetUrl = options?.stylesheetUrl

    return {
      scriptMode: 'npm',
      schema: import.meta.dev ? MapLibreOptions : undefined,
      scriptOptions: {
        use() {
          return import.meta.client && window.maplibregl
            ? { maplibregl: window.maplibregl }
            : undefined
        },
      },
      clientInit: import.meta.server
        ? undefined
        : async (ctx) => {
          const throwIfAborted = () => {
            if (ctx?.signal.aborted)
              throw ctx.signal.reason || new Error('Loading MapLibre was aborted')
          }
          throwIfAborted()

          if (injectStyles) {
            if (stylesheetUrl)
              ensureMapLibreStyles(stylesheetUrl)
            else
              await import('maplibre-gl/dist/maplibre-gl.css')
          }

          const maplibregl = window.maplibregl || await import('maplibre-gl')
          throwIfAborted()
          await configureMapLibreWorker(maplibregl, options?.workerUrl)
          window.maplibregl = maplibregl
          return { maplibregl }
        },
    }
  }, _options)
}
