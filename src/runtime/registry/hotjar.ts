import { number, object, optional } from 'valibot'
import { registryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'

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

export type HotjarInput = RegistryScriptInput<typeof HotjarOptions>

export function useScriptHotjar<T extends HotjarApi>(_options?: HotjarInput) {
  return registryScript<T, typeof HotjarOptions>('hotjar', options => ({
    scriptInput: {
      src: `https://static.hotjar.com/c/hotjar-${options?.id}.js?sv=${options?.sv}`,
    },
    schema: HotjarOptions,
    scriptOptions: {
      use() {
        return { hj: window.hj }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          window._hjSettings = window._hjSettings || { hjid: options?.id, hjsv: options?.sv }
          window.hj = window.hj || function (...params: any[]) {
            (window.hj.q = window.hj.q || []).push(params)
          }
        },
  }), _options)
}
