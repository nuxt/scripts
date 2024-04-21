import { object } from 'valibot'
import type VimeoPlayer from 'vimeo__player'
import { registryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'
import { useHead } from '#imports'

export interface VimeoPlayerApi {
  Player: VimeoPlayer
}

export const VimeoPlayerOptions = object({})

export type VimeoPlayerInput = RegistryScriptInput<typeof VimeoPlayerOptions>

declare global {
  interface Window {
    Vimeo: VimeoPlayerApi
  }
}

export function useScriptVimeoPlayer<T extends VimeoPlayerApi>(_options?: VimeoPlayerInput) {
  return registryScript<T, typeof VimeoPlayerOptions>('vimeoPlayer', () => ({
    scriptInput: {
      src: 'https://player.vimeo.com/api/player.js',
    },
    schema: VimeoPlayerOptions,
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
