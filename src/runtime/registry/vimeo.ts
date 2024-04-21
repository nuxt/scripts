import { object } from 'valibot'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
import type { RegistryScriptInput } from '#nuxt-scripts'

export interface VimeoScriptApi {
  Player: any
}

export const VimeoScriptOptions = object({})

export type VimeoPlayer = ((...params: any[]) => void) | undefined

export type VimeoScriptInput = RegistryScriptInput<typeof VimeoScriptOptions>

declare global {
  interface Window {
    Vimeo: VimeoScriptApi
  }
}

export function useScriptVimeo<T extends VimeoScriptApi>(options?: VimeoScriptInput) {
  return useScript<T>({
    key: 'vimeo',
    src: 'https://player.vimeo.com/api/player.js',
    ...options?.scriptInput,
  }, {
    ...registryScriptOptions({
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
