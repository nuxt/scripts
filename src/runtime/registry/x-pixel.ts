import { registryScript } from '../utils'
import { object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

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

type TwqFns =
  ((event: 'event', eventId: string, data?: EventObjectProperties) => void)
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
  interface Window extends XPixelApi {
  }
}

export const XPixelOptions = object({
  id: string(),
  version: optional(string()),
})
export type XPixelInput = RegistryScriptInput<typeof XPixelOptions>

export function useScriptXPixel<T extends XPixelApi>(_options?: XPixelInput) {
  return registryScript<T, typeof XPixelOptions>('xPixel', options => ({
    scriptInput: {
      src: 'https://static.ads-twitter.com/uwt.js',
    },
    schema: import.meta.dev ? XPixelOptions : undefined,
    scriptOptions: {
      use() {
        return { twq: window.twq }
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
          // @ts-expect-error untyped
            const s = window.twq = function (...params: any[]) {
            // @ts-expect-error untyped
              s.exe ? s.exe(s, ...params) : s.queue.push(params)
            }
            // @ts-expect-error untyped
            s.version = options?.version || '1.1'
            // @ts-expect-error untyped
            s.queue = [
              ['config', options?.id],
            ]
          },
    },
  }), _options)
}
