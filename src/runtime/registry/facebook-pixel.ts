import { type Input, number, object, parse, string, union } from 'valibot'
import { useScript } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

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

const FacebookPixelOptions = object({
  id: union([string(), number()]),
})

export function useScriptFacebookPixel<T extends FacebookPixelApi>(options?: Input<typeof FacebookPixelOptions>, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    // validate the schema
    if (import.meta.dev)
      parse(FacebookPixelOptions, options)

    // we need to insert the hj function
    if (import.meta.client) {
      const fbq: FacebookPixelApi['fbq'] = window.fbq = function (...params: any[]) {
        // @ts-expect-error untyped
        fbq.callMethod ? fbq.callMethod.apply(fbq, params) : fbq.queue.push(params)
      } as any as FacebookPixelApi['fbq']
      if (!window._fbq)
        window._fbq = fbq
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      fbq('init', options?.id)
      fbq('track', 'PageView')
    }
  }
  return useScript<T>({
    key: 'facebook-pixel',
    src: 'https://connect.facebook.net/en_US/fbevents.js',
    defer: true,
  }, {
    trigger: 'onNuxtReady',
    ...scriptOptions,
    assetStrategy: 'bundle',
    use() {
      return { fbq: window.fbq }
    },
  })
}
