import { useRegistryScript } from '../utils'
import { number, object, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

type StandardEvents = 'AddPaymentInfo' | 'AddToCart' | 'AddToWishlist' | 'CompleteRegistration' | 'Contact' | 'CustomizeProduct' | 'Donate' | 'FindLocation' | 'InitiateCheckout' | 'Lead' | 'Purchase' | 'Schedule' | 'Search' | 'StartTrial' | 'SubmitApplication' | 'Subscribe' | 'ViewContent'
interface EventObjectProperties {
  content_category?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  contents?: { id: string, quantity: number }[]
  currency?: string
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery'
  num_items?: number
  predicted_ltv?: number
  search_string?: string
  status?: 'completed' | 'updated' | 'viewed' | 'added_to_cart' | 'removed_from_cart' | string
  value?: number
  [key: string]: any
}
type ConsentAction = 'grant' | 'revoke'

type FbqArgs
  = | ['track', StandardEvents, EventObjectProperties?]
    | ['trackCustom', string, EventObjectProperties?]
    | ['trackSingle', string, StandardEvents, EventObjectProperties?]
    | ['trackSingleCustom', string, string, EventObjectProperties?]
    | ['init', string]
    | ['init', number, Record<string, any>?]
    | ['consent', ConsentAction]
  // fallback: allow any fbq call signature not covered above
    | [string, ...any[]]
type FbqFns = (...args: FbqArgs) => void

export interface MetaPixelApi {
  fbq: FbqFns & {
    push: FbqFns
    loaded: boolean
    version: string
    queue: any[]
  }
  _fbq: MetaPixelApi['fbq']
  callMethod?: FbqFns
}

declare global {
  interface Window extends MetaPixelApi {}
}

export const MetaPixelOptions = object({
  id: union([string(), number()]),
})
export type MetaPixelInput = RegistryScriptInput<typeof MetaPixelOptions, true, false, false>

export function useScriptMetaPixel<T extends MetaPixelApi>(_options?: MetaPixelInput) {
  return useRegistryScript<T, typeof MetaPixelOptions>('metaPixel', options => ({
    scriptInput: {
      src: 'https://connect.facebook.net/en_US/fbevents.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? MetaPixelOptions : undefined,
    scriptOptions: {
      use() {
        return { fbq: window.fbq }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const fbq: MetaPixelApi['fbq'] = window.fbq = function (...params: any[]) {
            // @ts-expect-error untypeds
            if (fbq.callMethod) {
              // @ts-expect-error untyped
              fbq.callMethod(...params)
            }
            else {
              fbq.queue.push(params)
            }
          } as any as MetaPixelApi['fbq']
          if (!window._fbq)
            window._fbq = fbq
          fbq.push = fbq
          fbq.loaded = true
          fbq.version = '2.0'
          fbq.queue = []
          fbq('init', options?.id)
          fbq('track', 'PageView')
        },
  }), _options)
}
