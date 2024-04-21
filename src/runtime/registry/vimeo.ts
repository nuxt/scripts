import { object } from 'valibot'
import {registryScript, registryScriptOptions} from '../utils'
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
  return registryScript<T>('vimeo', {
    scriptInput: {
      src: 'https://player.vimeo.com/api/player.js',
    },
    schema: VimeoScriptOptions,
    scriptOptions: {
      use() {
        let Player: VimeoPlayer
        if (import.meta.client) {
          Player = function (...params: any[]) {
            return new window.Vimeo.Player(...params)
          }
        }
        return {Player}
      },
    }
  }, options)
}
