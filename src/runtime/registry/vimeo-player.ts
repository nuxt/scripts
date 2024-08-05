import { watch } from 'vue'
import type Vimeo from '@vimeo/player'
import { useRegistryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'
import { useHead } from '#imports'

type Constructor<T extends new (...args: any) => any> = T extends new (...args: infer A) => infer R ? new (...args: A) => R : never

export interface VimeoPlayerApi {
  Vimeo: {
    Player: Constructor<typeof Vimeo>
  }
}

export type VimeoPlayerInput = RegistryScriptInput

declare global {
  interface Window extends VimeoPlayerApi {}
}

export function useScriptVimeoPlayer<T extends VimeoPlayerApi>(_options?: VimeoPlayerInput) {
  const instance = useRegistryScript<T>('vimeoPlayer', () => ({
    scriptInput: {
      src: 'https://player.vimeo.com/api/player.js',
    },
    scriptOptions: {
      use() {
        return {
          Vimeo: window.Vimeo,
        }
      },
    },
  }), _options)
  if (import.meta.client) {
    const _ = watch(instance.$script.status, (status) => {
      if (status === 'loading') {
        useHead({
          link: [
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
        _()
      }
    })
  }
  return instance
}
