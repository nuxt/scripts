import type { UseScriptInput } from '@unhead/vue'
import { useRegistryScript } from '../utils'
import { object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

interface ContentProperties {
  content_type?: string | null
  content_id?: string | number | null
  content_name?: string | null
  content_price?: string | number | null
  num_items?: string | number | null
  content_group_id?: string | number | null
}

interface EventObjectProperties {
  // this is the same as Twitter events
  value?: string | number | null
  currency?: string | null
  conversion_id?: string | number | null
  email_address?: string | null
  phone_number?: string | null
  contents: ContentProperties[]
}

type TwqFns
  = ((event: 'event', eventId: string, data?: EventObjectProperties) => void)
    & ((event: 'config', id: string) => void)
    & ((event: string, ...params: any[]) => void)

export interface XPixelApi {
  twq: TwqFns & {
    loaded: boolean
    version: string
    queue: any[]
  }
}

declare global {
  interface Window extends XPixelApi {}
}

export const XPixelOptions = object({
  id: string(),
  version: optional(string()),
})
export type XPixelInput = RegistryScriptInput<typeof XPixelOptions, true, false, false>

export function useScriptXPixel<T extends XPixelApi>(_options?: XPixelInput) {
  return useRegistryScript<T, typeof XPixelOptions>('xPixel', (options) => {
    return ({
      scriptInput: {
        src: 'https://static.ads-twitter.com/uwt.js',
        crossorigin: false,
      } as UseScriptInput,
      clientInit: import.meta.server
        ? undefined
        : () => {
          // @ts-expect-error untyped
            const s = window.twq = function (...args) {
              // @ts-expect-error untyped
              if (s.exe) {
                // @ts-expect-error untyped
                s.exe(s, args)
              }
              else {
                // @ts-expect-error untyped
                s.queue.push(args)
              }
            }
            // @ts-expect-error untyped
            s.version = options?.version || '1.1'
            // @ts-expect-error untyped
            s.queue = [
              ['config', options?.id],
            ]
          },
      schema: import.meta.dev ? XPixelOptions : undefined,
      scriptOptions: {
        use() {
          return { twq: window.twq }
        },
      },
    })
  }, _options)
}
