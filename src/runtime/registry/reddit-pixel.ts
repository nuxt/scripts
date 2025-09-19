import type { UseScriptInput } from '@unhead/vue'
import { useRegistryScript } from '../utils'
import { object, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

type RdtFns
  = & ((event: 'init', id: string) => void)
    & ((event: 'track', eventName: string) => void)

export interface RedditPixelApi {
  rdt: RdtFns & {
    sendEvent: (rdt: RedditPixelApi['rdt'], args: unknown[]) => void
    callQueue: unknown[]
  }
}

declare global {
  interface Window extends RedditPixelApi {}
}

export const RedditPixelOptions = object({
  id: string(),
})
export type RedditPixelInput = RegistryScriptInput<typeof RedditPixelOptions, true, false, false>

export function useScriptRedditPixel<T extends RedditPixelApi>(_options?: RedditPixelInput) {
  return useRegistryScript<T, typeof RedditPixelOptions>('redditPixel', (options) => {
    return ({
      scriptInput: {
        src: 'https://www.redditstatic.com/ads/pixel.js',
        async: true,
      } as UseScriptInput,
      clientInit: import.meta.server
        ? undefined
        : () => {
            const rdt = function (...args: unknown[]) {
              if ((rdt as any).sendEvent) {
                (rdt as any).sendEvent(rdt, args)
              }
              else {
                (rdt as any).callQueue.push(args)
              }
            } as RedditPixelApi['rdt']
            ;(rdt as any).callQueue = []
            window.rdt = rdt
            if (options?.id) {
              rdt('init', options.id)
              rdt('track', 'PageVisit')
            }
          },
      schema: import.meta.dev ? RedditPixelOptions : undefined,
      scriptOptions: {
        use() {
          return { rdt: window.rdt }
        },
      },
    })
  }, _options)
}
