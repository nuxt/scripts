import type Vimeo from '@vimeo/player'
import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useHead } from '@unhead/vue'
import { watch } from 'vue'
import { useRegistryScript } from '../utils'

type Constructor<T extends new (...args: any) => any> = T extends new (...args: infer A) => infer R ? new (...args: A) => R : never

export interface VimeoPlayerApi {
  Vimeo: {
    Player: Constructor<typeof Vimeo>
  }
}

export type VimeoPlayerInput = RegistryScriptInput

declare global {
  // Declared inline rather than via `extends`: an `extends` clause on the global `Window`
  // surfaces as an unsuppressable TS2430 in consumer code when another package declares it (#852).
  interface Window {
    Vimeo: VimeoPlayerApi['Vimeo']
  }
}

export function useScriptVimeoPlayer<T extends VimeoPlayerApi>(_options?: VimeoPlayerInput): UseScriptContext<T> {
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
    const _ = watch(instance.status, (status) => {
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
