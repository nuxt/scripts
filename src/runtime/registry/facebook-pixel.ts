import { number, object, string, union } from 'valibot'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
import type { RegistryScriptInput } from '#nuxt-scripts'

type StandardEvents = 'AddPaymentInfo' | 'AddToCart' | 'AddToWishlist' | 'CompleteRegistration' | 'Contact' | 'CustomizeProduct' | 'Donate' | 'FindLocation' | 'InitiateCheckout' | 'Lead' | 'Purchase' | 'Schedule' | 'Search' | 'StartTrial' | 'SubmitApplication' | 'Subscribe' | 'ViewContent'
interface EventObjectProperties {
  content_category?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  contents: { id: string, quantity: number }[]
  currency?: string
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery'
  num_items?: number
  predicted_ltv?: number
  search_string?: string
  status?: 'completed' | 'updated' | 'viewed' | 'added_to_cart' | 'removed_from_cart' | string
  value?: number
  [key: string]: any
}

type FbqFns = ((event: 'track', eventName: StandardEvents, data?: EventObjectProperties) => void) & ((event: 'trackCustom', eventName: string, data?: EventObjectProperties) => void) & ((event: 'init', id: number, data?: Record<string, any>) => void) & ((event: 'init', id: string) => void) & ((event: string, ...params: any[]) => void)

export interface FacebookPixelApi {
  fbq: FbqFns & {
    push: FbqFns
    loaded: boolean
    version: string
    queue: any[]
  }
  _fbq: FacebookPixelApi['fbq']
}

declare global {
  interface Window extends FacebookPixelApi {
  }
}

export const FacebookPixelOptions = object({
  id: union([string(), number()]),
})
export type FacebookPixelInput = RegistryScriptInput<typeof FacebookPixelOptions>

export function useScriptFacebookPixel<T extends FacebookPixelApi>(options?: FacebookPixelInput) {
  return useScript<T>({
    key: 'facebookPixel',
    src: 'https://connect.facebook.net/en_US/fbevents.js',
    ...options?.scriptInput,
  }, {
    ...registryScriptOptions({
      schema: FacebookPixelOptions,
      options,
      clientInit: import.meta.server
        ? undefined
        : () => {
            const fbq: FacebookPixelApi['fbq'] = window.fbq = function (...params: any[]) {
            // @ts-expect-error untyped
              fbq.callMethod ? fbq.callMethod(...params) : fbq.queue.push(params)
            } as any as FacebookPixelApi['fbq']
            if (!window._fbq)
              window._fbq = fbq
            fbq.push = fbq
            fbq.loaded = true
            fbq.version = '2.0'
            fbq.queue = []
            fbq('init', options?.id)
            fbq('track', 'PageView')
          },
    }),
    use() {
      return { fbq: window.fbq }
    },
  })
}
