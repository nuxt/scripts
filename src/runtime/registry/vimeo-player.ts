import type VimeoPlayer from 'vimeo__player'
import { useRegistryScript } from '../utils'
import { object } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'
import { useHead } from '#imports'

export interface VimeoPlayerApi {
  Vimeo: {
    Player: VimeoPlayer
  }
}

export const VimeoPlayerOptions = object({})

export type VimeoPlayerInput = RegistryScriptInput<typeof VimeoPlayerOptions>

declare global {
  interface Window extends VimeoPlayerApi {}
}

export function useScriptVimeoPlayer<T extends VimeoPlayerApi>(_options?: VimeoPlayerInput) {
  return useRegistryScript<T, typeof VimeoPlayerOptions>('vimeoPlayer', () => ({
    scriptInput: {
      src: 'https://player.vimeo.com/api/player.js',
    },
    schema: import.meta.dev ? VimeoPlayerOptions : undefined,
    scriptOptions: {
      use() {
        return {
          Vimeo: window.Vimeo,
        }
      },
    },
    beforeInit() {
      useHead({
        link: [
          {
            rel: 'preconnect',
            href: 'https://player.vimeo.com',
          },
          {
            rel: 'preconnect',
            href: 'https://i.vimeocdn.com',
          },
          {
            rel: 'preconnect',
            href: 'https://f.vimeocdn.com',
          },
          {
            rel: 'preconnect',
            href: 'https://fresnel.vimeocdn.com',
          },
        ],
      })
    },
  }), _options)
}
