import { withQuery } from 'ufo'
import { useRegistryScript } from '#nuxt-scripts/utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { object, string, optional } from '#nuxt-scripts-validator'

export type GtagCustomParams = Record<string, any>

// Consent mode types
export type ConsentStatus = 'granted' | 'denied'

export interface ConsentOptions {
  ad_user_data?: ConsentStatus
  ad_personalization?: ConsentStatus
  ad_storage?: ConsentStatus
  analytics_storage?: ConsentStatus
  functionality_storage?: ConsentStatus
  personalization_storage?: ConsentStatus
  security_storage?: ConsentStatus
  wait_for_update?: number
  region?: string[]
}

// Config parameters type
export interface ConfigParams extends GtagCustomParams {
  send_page_view?: boolean
  transport_url?: string
  cookie_domain?: string
  cookie_prefix?: string
  cookie_expires?: number
  cookie_update?: boolean
  cookie_flags?: string
  user_id?: string
}

// Event parameters with common GA4 event parameters
export interface EventParameters extends GtagCustomParams {
  value?: number
  currency?: string
  transaction_id?: string
  items?: Array<{
    item_id?: string
    item_name?: string
    item_category?: string
    item_variant?: string
    price?: number
    quantity?: number
    [key: string]: any
  }>
  [key: string]: any
}

// Default events in GA4
export type DefaultEventName
  = | 'add_payment_info'
    | 'add_shipping_info'
    | 'add_to_cart'
    | 'add_to_wishlist'
    | 'begin_checkout'
    | 'purchase'
    | 'refund'
    | 'remove_from_cart'
    | 'select_item'
    | 'select_promotion'
    | 'view_cart'
    | 'view_item'
    | 'view_item_list'
    | 'view_promotion'
    | 'login'
    | 'sign_up'
    | 'search'
    | 'page_view'
    | 'screen_view'
    | string // Allow custom event names

// Define the GTag function interface with proper overloads
export interface GTag {
  // Initialize gtag.js with timestamp
  (command: 'js', value: Date): void

  // Configure a GA4 property
  (command: 'config', targetId: string, configParams?: ConfigParams): void

  // Get a value from gtag
  (command: 'get', targetId: string, fieldName: string, callback?: (field: any) => void): void

  // Send an event to GA4
  (command: 'event', eventName: DefaultEventName, eventParams?: EventParameters): void

  // Set default parameters for all subsequent events
  (command: 'set', params: GtagCustomParams): void

  // Update consent state
  (command: 'consent', consentArg: 'default' | 'update', consentParams: ConsentOptions): void
}

// Define the dataLayer array type
export interface DataLayerObject {
  event?: string
  [key: string]: any
}

export type DataLayer = Array<DataLayerObject>

// Define the complete Google Analytics API interface
export interface GoogleAnalyticsApi {
  gtag: GTag
  dataLayer: DataLayer
}

export const GoogleAnalyticsOptions = object({
  id: optional(string()), // The GA4 measurement ID (format: G-XXXXXXXX)
  l: optional(string()), // Optional global name for dataLayer (defaults to 'dataLayer')
})

export type GoogleAnalyticsInput = RegistryScriptInput<typeof GoogleAnalyticsOptions>

export function useScriptGoogleAnalytics<T extends GoogleAnalyticsApi>(_options?: GoogleAnalyticsInput & { onBeforeGtagStart?: (gtag: GTag) => void }) {
  return useRegistryScript<T, typeof GoogleAnalyticsOptions>(_options?.key || 'googleAnalytics', (options) => {
    const dataLayerName = options?.l ?? 'dataLayer'
    const w = import.meta.client ? window as any : {}
    return {
      scriptInput: {
        src: withQuery('https://www.googletagmanager.com/gtag/js', { id: options?.id, l: options?.l }),
      },
      schema: import.meta.dev ? GoogleAnalyticsOptions : undefined,
      scriptOptions: {
        use: () => {
          return {
            dataLayer: w[dataLayerName] as DataLayer,
            gtag: w.gtag as DataLayer,
          }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            w[dataLayerName] = w[dataLayerName] || []
            w.gtag = function () {
              // eslint-disable-next-line
              w[dataLayerName].push(arguments)
            }
            // eslint-disable-next-line
          // @ts-ignore
            _options?.onBeforeGtagStart?.(w.gtag)
            w.gtag('js', new Date())
            if (options?.id) {
              w.gtag('config', (options?.id))
            }
          },
    }
  }, _options)
}
