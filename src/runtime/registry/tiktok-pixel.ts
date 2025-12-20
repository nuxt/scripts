import { withQuery } from 'ufo'
import { useRegistryScript } from '../utils'
import { object, string, optional, boolean } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

type StandardEvents
  = 'ViewContent'
    | 'ClickButton'
    | 'Search'
    | 'AddToWishlist'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'CompletePayment'
    | 'PlaceAnOrder'
    | 'Contact'
    | 'Download'
    | 'SubmitForm'
    | 'CompleteRegistration'
    | 'Subscribe'

interface EventProperties {
  content_id?: string
  content_type?: string
  content_name?: string
  contents?: Array<{ content_id: string, content_type?: string, content_name?: string, price?: number, quantity?: number }>
  currency?: string
  value?: number
  description?: string
  query?: string
  [key: string]: any
}

interface IdentifyProperties {
  email?: string
  phone_number?: string
  external_id?: string
}

type TtqFns
  = ((cmd: 'track', event: StandardEvents | string, properties?: EventProperties) => void)
    & ((cmd: 'page') => void)
    & ((cmd: 'identify', properties: IdentifyProperties) => void)
    & ((cmd: string, ...args: any[]) => void)

export interface TikTokPixelApi {
  ttq: TtqFns & {
    push: TtqFns
    loaded: boolean
    queue: any[]
  }
}

declare global {
  interface Window extends TikTokPixelApi {}
}

export const TikTokPixelOptions = object({
  id: string(),
  trackPageView: optional(boolean()), // default true
})

export type TikTokPixelInput = RegistryScriptInput<typeof TikTokPixelOptions, true, false, false>

export function useScriptTikTokPixel<T extends TikTokPixelApi>(_options?: TikTokPixelInput) {
  return useRegistryScript<T, typeof TikTokPixelOptions>('tiktokPixel', options => ({
    scriptInput: {
      src: withQuery('https://analytics.tiktok.com/i18n/pixel/events.js', {
        sdkid: options?.id,
        lib: 'ttq',
      }),
      crossorigin: false,
    },
    schema: import.meta.dev ? TikTokPixelOptions : undefined,
    scriptOptions: {
      use() {
        return { ttq: window.ttq }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const ttq: TikTokPixelApi['ttq'] = window.ttq = function (...params: any[]) {
            // @ts-expect-error untyped
            if (ttq.callMethod) {
              // @ts-expect-error untyped
              ttq.callMethod(...params)
            }
            else {
              ttq.queue.push(params)
            }
          } as any
          ttq.push = ttq
          ttq.loaded = true
          ttq.queue = []
          if (options?.id) {
            ttq('init', options.id)
            if (options?.trackPageView !== false) {
              ttq('page')
            }
          }
        },
  }), _options)
}
