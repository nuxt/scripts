import { useRegistryScript } from '#nuxt-scripts/utils'
import { object, string } from '#nuxt-scripts-validator'
import type { NuxtUseScriptOptions } from '#nuxt-scripts/types'

export interface MyCustomScriptApi {
  track: (event: string, data?: Record<string, any>) => void
  identify: (userId: string) => void
  init: (apiKey: string) => void
}

declare global {
  interface Window {
    MyCustomScript: MyCustomScriptApi
  }
}

// Schema for validation and DevTools metadata
const MyCustomScriptSchema = object({
  apiKey: string(),
})

export function useScriptMyCustomScript<T extends MyCustomScriptApi>(options?: {
  apiKey: string
  scriptOptions?: NuxtUseScriptOptions
}) {
  return useRegistryScript<T, typeof MyCustomScriptSchema>('myCustomScript', () => ({
    scriptInput: {
      src: '/mock-custom-script.js',
    },
    scriptOptions: {
      ...options?.scriptOptions,
      use() {
        // Initialize the mock script
        if (window.MyCustomScript) {
          window.MyCustomScript.init(options?.apiKey || 'demo-key')
          return window.MyCustomScript as T
        }
        return {} as T
      },
    },
  }), options, { schema: MyCustomScriptSchema })
}
