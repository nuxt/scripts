import { useRegistryScript } from '../utils'
import type { InferInput } from '#nuxt-scripts-validator'
import { boolean, object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

type StandardEvents = 'PAGE_VIEW' | 'VIEW_CONTENT' | 'ADD_CART' | 'SIGN_UP' | 'SAVE' | 'START_CHECKOUT' | 'APP_OPEN' | 'ADD_BILLING' | 'SEARCH' | 'SUBSCRIBE' | 'AD_CLICK' | 'AD_VIEW' | 'COMPLETE_TUTORIAL' | 'LEVEL_COMPLETE' | 'INVITE' | 'LOGIN' | 'SHARE' | 'RESERVE' | 'ACHIEVEMENT_UNLOCKED' | 'ADD_TO_WISHLIST' | 'SPENT_CREDITS' | 'RATE' | 'START_TRIAL' | 'LIST_VIEW'

interface EventObjectProperties {
  price?: number
  client_dedup_id?: string
  currency?: string
  transaction_id?: string
  item_ids?: string[]
  item_category?: string
  description?: string
  search_string?: string
  number_items?: number
  payment_info_available?: 0 | 1
  sign_up_method?: string
  success?: 0 | 1
  brands?: string[]
  delivery_method?: 'in_store' | 'curbside' | 'delivery'
  customer_status?: 'new' | 'returning' | 'reactivated'
  event_tag?: string
  [key: string]: any
}

export const InitObjectPropertiesSchema = object({
  user_email: optional(string()),
  ip_address: optional(string()),
  user_phone_number: optional(string()),
  user_hashed_email: optional(string()),
  user_hashed_phone_number: optional(string()),
  firstname: optional(string()),
  lastname: optional(string()),
  geo_city: optional(string()),
  geo_region: optional(string()),
  geo_postal_code: optional(string()),
  geo_country: optional(string()),
  age: optional(string()),
})

type InitObjectProperties = InferInput<typeof InitObjectPropertiesSchema>

type SnapTrFns =
  ((event: 'track', eventName: StandardEvents | '', data?: EventObjectProperties) => void) &
  ((event: 'init', id: string, data?: Record<string, any>) => void) &
  ((event: 'init', id: string, data?: InitObjectProperties) => void) &
  ((event: string, ...params: any[]) => void)

export interface SnapPixelApi {
  snaptr: SnapTrFns & {
    push: SnapTrFns
    loaded: boolean
    version: string
    queue: any[]
  }
  _snaptr: SnapPixelApi['snaptr']
  handleRequest?: SnapTrFns
}

declare global {
  interface Window extends SnapPixelApi {}
}

export const SnapTrPixelOptions = object({
  id: string(),
  trackPageView: optional(boolean()),
  ...(InitObjectPropertiesSchema?.entries || {}),
})
export type SnapTrPixelInput = RegistryScriptInput<typeof SnapTrPixelOptions, true, false, false>

export function useScriptSnapchatPixel<T extends SnapPixelApi>(_options?: SnapTrPixelInput) {
  return useRegistryScript<T, typeof SnapTrPixelOptions>('snapchatPixel', options => ({
    scriptInput: {
      src: 'https://sc-static.net/scevent.min.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? SnapTrPixelOptions : undefined,
    scriptOptions: {
      use() {
        return { snaptr: window.snaptr }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const snaptr: SnapPixelApi['snaptr'] = window.snaptr = function (...params: any[]) {
            // @ts-expect-error untypeds
            if (snaptr.handleRequest) {
              // @ts-expect-error untyped
              snaptr.handleRequest(...params)
            }
            else {
              snaptr.queue.push(params)
            }
          } as any as SnapPixelApi['snaptr']
          if (!window.snaptr)
            window._snaptr = snaptr
          snaptr.push = snaptr
          snaptr.loaded = true
          snaptr.version = '1.0'
          snaptr.queue = []
          const { id, ...initData } = options
          snaptr('init', options?.id, initData)
          if (options?.trackPageView) {
            snaptr('track', 'PAGE_VIEW')
          }
        },
  }), _options)
}
