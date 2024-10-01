import type { UseScriptInput } from '@unhead/vue'
import { useRegistryScript } from '../utils'
import { object, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

type RdtFns =
    & ((event: 'init', id: string) => void)
    & ((event: 'track', eventName: string) => void)

export interface RedditPixelApi {
  rdt: RdtFns & {
    sendEvent: any
    callQueue: any
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
            // @ts-expect-error untyped
            const rdt: RedditPixelApi['rdt'] = window.rdt = function (...args) {
              if (rdt.sendEvent) {
                rdt.sendEvent(rdt, args)
              }
              else {
                rdt.callQueue.push(args)
              }
            }
            rdt.callQueue = []
            rdt('init', options?.id)
            rdt('track', 'PageVisit')
          },
      // No schema needed as script doesn't require specific configuration
      scriptOptions: {
        use() {
          return { rdt: window.rdt }
        },
      },
    })
  }, _options)
}
