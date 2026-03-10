import type { RegistryScriptInput } from '#nuxt-scripts/types'
import type { UseScriptInput } from '@unhead/vue'
import { useRegistryScript } from '../utils'
import { RedditPixelOptions } from './schemas'

type StandardEvents = 'PageVisit' | 'ViewContent' | 'Search' | 'AddToCart' | 'AddToWishlist' | 'Purchase' | 'Lead' | 'SignUp'

type RdtFns
  = & ((event: 'init', id: string) => void)
    & ((event: 'track', eventName: StandardEvents | (string & {}), properties?: Record<string, any>) => void)

export interface RedditPixelApi {
  rdt: RdtFns & {
    sendEvent: (rdt: RedditPixelApi['rdt'], args: unknown[]) => void
    callQueue: unknown[]
  }
}

declare global {
  interface Window extends RedditPixelApi {}
}

export { RedditPixelOptions }
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
