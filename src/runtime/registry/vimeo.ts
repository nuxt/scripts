import { type Input, object } from 'valibot'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
import type { NuxtUseScriptIntegrationOptions } from '#nuxt-scripts'

export interface VimeoScriptApi {
  Player: any
}

export const VimeoScriptOptions = object({})

export type VimeoPlayer = ((...params: any[]) => void) | undefined

export type VimeoScriptInput = Input<typeof VimeoScriptOptions>

declare global {
  interface Window {
    Vimeo: VimeoScriptApi
  }
}

export function useScriptVimeo<T extends VimeoScriptApi>(options?: VimeoScriptInput, scriptOptions?: NuxtUseScriptIntegrationOptions) {
  return useScript<T>({
    key: 'vimeo',
    src: 'https://player.vimeo.com/api/player.js',
    ...options,
  }, {
    ...registryScriptOptions({
      scriptOptions,
      schema: VimeoScriptOptions,
      options,
    }),
    use() {
      let Player: VimeoPlayer
      if (import.meta.client) {
        Player = function (...params: any[]) {
          return new window.Vimeo.Player(...params)
        }
      }
      return { Player }
    },
  })
}
