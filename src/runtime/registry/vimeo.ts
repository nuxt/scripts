import { object } from 'valibot'
import { registryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'

export interface VimeoApi {
  Player: VimeoPlayer
}

export const VimeoOptions = object({})

export type VimeoPlayer = ((...params: any[]) => void) | undefined

export type VimeoInput = RegistryScriptInput<typeof VimeoOptions>

declare global {
  interface Window {
    Vimeo: VimeoApi
  }
}

export function useScriptVimeo<T extends VimeoApi>(_options?: VimeoInput) {
  return registryScript<T, typeof VimeoOptions>('vimeo', () => ({
    scriptInput: {
      src: 'https://player.vimeo.com/api/player.js',
    },
    schema: VimeoOptions,
    scriptOptions: {
      use() {
        let Player: VimeoPlayer
        if (import.meta.client) {
          Player = function (...params: any[]) {
            return new window.Vimeo.Player(...params)
          }
        }
        return { Player }
      },
    },
  }), _options)
}
