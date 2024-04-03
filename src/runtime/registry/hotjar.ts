import { number, object, optional } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions, NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

export interface HotjarApi {
  hj: ((event: 'identify', userId: string, attributes?: Record<string, any>) => void) & ((event: 'stateChange', path: string) => void) & ((event: 'event', eventName: string) => void) & ((event: string, arg?: string) => void) & ((...params: any[]) => void) & {
    q: any[]
  }
}

declare global {
  interface Window extends HotjarApi {
    _hjSettings: { hjid: number, hjsv?: number }
  }
}

export const HotjarOptions = object({
  id: number(),
  sv: optional(number()),
})

export type HotjarInput = ScriptDynamicSrcInput<typeof HotjarOptions>

export function useScriptHotjar<T extends HotjarApi>(options?: HotjarInput, _scriptOptions?: NuxtUseScriptIntegrationOptions) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(HotjarOptions, options)
    // we need to insert the hj function
    if (import.meta.client) {
      window._hjSettings = window._hjSettings || { hjid: options?.id, hjsv: options?.sv }
      window.hj = window.hj || function (...params: any[]) {
        (window.hj.q = window.hj.q || []).push(params)
      }
    }
    _scriptOptions?.beforeInit?.()
  }
  return useScript<T>({
    key: 'hotjar',
    // requires extra steps to bundle
    src: options?.src || `https://static.hotjar.com/c/hotjar-${options?.id}.js?sv=${options?.sv}`,
  }, {
    ...scriptOptions,
    use() {
      return { hj: window.hj }
    },
  })
}
