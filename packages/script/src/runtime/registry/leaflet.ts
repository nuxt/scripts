import type * as Leaflet from 'leaflet'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { configureLeafletDefaultIcons, ensureLeafletStyles } from '../leaflet-styles'
import { useRegistryScript } from '../utils'
import { LeafletOptions } from './schemas'

export { LeafletOptions }

export type LeafletInput = RegistryScriptInput<typeof LeafletOptions>

export interface LeafletApi {
  L: typeof Leaflet
}

declare global {
  interface Window extends LeafletApi {}
}

export function useScriptLeaflet<T extends LeafletApi>(_options?: LeafletInput) {
  return useRegistryScript<T, typeof LeafletOptions>('leaflet', (options, context) => {
    const injectStyles = options?.injectStyles !== false
    const usesDefaultSource = !context.scriptInput?.src
    return {
      scriptInput: {
        src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        ...(usesDefaultSource
          ? {
              integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
              crossorigin: 'anonymous',
            }
          : {}),
      },
      clientInit: injectStyles ? ensureLeafletStyles : undefined,
      schema: import.meta.dev ? LeafletOptions : undefined,
      scriptOptions: {
        use() {
          const leaflet = window.L
          if (injectStyles && leaflet)
            configureLeafletDefaultIcons(leaflet)
          return { L: leaflet }
        },
      },
    }
  }, _options)
}
