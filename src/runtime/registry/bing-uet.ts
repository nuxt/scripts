import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { BingUetOptions } from './schemas'

export { BingUetOptions }

export type BingUetInput = RegistryScriptInput<typeof BingUetOptions, true, false>

export interface BingUetApi {
  uetq: {
    push: (event: string | Record<string, any>) => void
  }
}

declare global {
  interface Window {
    UET: new (options: { ti: string, enableAutoSpaTracking?: boolean, q?: any[] }) => BingUetApi['uetq']
    uetq: any[] | BingUetApi['uetq']
  }
}

export function useScriptBingUet<T extends BingUetApi>(_options?: BingUetInput) {
  return useRegistryScript<T, typeof BingUetOptions>('bingUet', options => ({
    scriptInput: {
      src: '//bat.bing.com/bat.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? BingUetOptions : undefined,
    scriptOptions: {
      use() {
        // After bat.js loads, initialize UET if not already done
        if (options?.id && typeof window.UET === 'function' && Array.isArray(window.uetq)) {
          const uetOptions: Record<string, any> = {
            ti: options.id,
            enableAutoSpaTracking: options.enableAutoSpaTracking ?? true,
          }
          uetOptions.q = window.uetq
          window.uetq = new window.UET(uetOptions)
          window.uetq.push('pageLoad')
        }
        return { uetq: window.uetq }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          window.uetq = window.uetq || []
        },
  }), _options)
}
