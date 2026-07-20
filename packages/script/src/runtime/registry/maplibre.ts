import type * as MapLibre from 'maplibre-gl'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { ensureMapLibreStyles, MAPLIBRE_STYLESHEET_URL } from '../maplibre-styles'
import { useRegistryScript } from '../utils'
import { MapLibreOptions } from './schemas'

export { MapLibreOptions }

export type MapLibreInput = RegistryScriptInput<typeof MapLibreOptions>

export interface MapLibreApi {
  maplibregl: typeof MapLibre
}

declare global {
  interface Window extends MapLibreApi {}
}

export function useScriptMapLibre<T extends MapLibreApi>(_options?: MapLibreInput) {
  return useRegistryScript<T, typeof MapLibreOptions>('maplibre', (options, context) => {
    const injectStyles = options?.injectStyles !== false
    const stylesheetUrl = options?.stylesheetUrl || MAPLIBRE_STYLESHEET_URL
    const usesDefaultSource = !context.scriptInput?.src

    return {
      scriptInput: {
        src: 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js',
        ...(usesDefaultSource
          ? {
              integrity: 'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp',
              crossorigin: 'anonymous',
            }
          : {}),
      },
      clientInit: injectStyles ? () => ensureMapLibreStyles(stylesheetUrl) : undefined,
      schema: import.meta.dev ? MapLibreOptions : undefined,
      scriptOptions: {
        use() {
          if (options?.workerUrl)
            window.maplibregl.setWorkerUrl(options.workerUrl)
          return { maplibregl: window.maplibregl }
        },
      },
    }
  }, _options)
}
