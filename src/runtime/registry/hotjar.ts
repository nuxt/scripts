import { type Input, number, object, optional } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

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

const HotjarOptions = object({
  id: number(),
  sv: optional(number()),
})

export function useScriptHotjar<T extends HotjarApi>(options?: Input<typeof HotjarOptions>, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    validateScriptInputSchema(HotjarOptions, options)
    // we need to insert the hj function
    if (import.meta.client) {
      window._hjSettings = window._hjSettings || { hjid: options?.id, hjsv: options?.sv }
      window.hj = window.hj || function (...params: any[]) {
        (window.hj.q = window.hj.q || []).push(params)
      }
    }
  }
  return useScript<T>({
    key: 'hotjar',
    src: `https://static.hotjar.com/c/hotjar-${options?.id}.js?sv=${options?.sv}`,
    defer: true,
  }, {
    trigger: 'onNuxtReady',
    ...scriptOptions,
    assetStrategy: 'bundle',
    use() {
      return { hj: window.hj }
    },
  })
}
