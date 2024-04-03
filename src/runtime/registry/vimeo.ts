import { type Input, object, string } from 'valibot'
import { useScript } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export interface VimeoScriptApi {
  Player: any
}

export const VimeoScriptOptions = object({})

export type VimeoPlayer = (...params: any[]) => void | undefined

export type VimeoScriptInput = Input<typeof VimeoScriptOptions>

declare global {
  interface Window {
    Vimeo: VimeoScriptApi
  }
}

export function useScriptVimeo<T>(options?: VimeoScriptInput, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  let Player: VimeoPlayer

  scriptOptions.beforeInit = () => {
    if (import.meta.client) {
      Player = function (...params: any[]) {
        return new window.Vimeo.Player(...params)
      }
    }
  }
  
  return useScript<VimeoScriptApi>({
    key: 'myCustomScript',
    src: 'https://player.vimeo.com/api/player.js',
    ...options,
  }, {
    ...scriptOptions,
    use: () => ({ Player }),
  })
}
