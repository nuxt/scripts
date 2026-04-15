import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { BingUetOptions } from './schemas'

export { BingUetOptions }

export type BingUetInput = RegistryScriptInput<typeof BingUetOptions, true, false>

export type BingUetConsentStatus = 'granted' | 'denied'

export interface BingUetConsentOptions {
  /**
   * Controls storage of advertising identifiers. Currently the only field UET honors.
   */
  ad_storage?: BingUetConsentStatus
}

// Standard event names recognized by UET (from bat.js `knownEvents`), plus string fallback for custom events.
export type BingUetEventName
  = | 'page_view'
    | 'screen_view'
    | 'login'
    | 'sign_up'
    | 'subscribe'
    | 'start_trial'
    | 'lead'
    | 'generate_lead'
    | 'submit_lead_form'
    | 'contact'
    | 'search'
    | 'view_search_results'
    | 'select_content'
    | 'share'
    | 'exception'
    | 'find_location'
    | 'book_appointment'
    | 'get_route'
    | 'view_item'
    | 'view_item_list'
    | 'view_promotion'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'add_to_wishlist'
    | 'add_payment_info'
    | 'begin_checkout'
    | 'checkout_progress'
    | 'set_checkout_option'
    | 'purchase'
    | 'refund'
    | (string & {})

export interface BingUetItem {
  id?: string
  name?: string
  brand?: string
  category?: string
  variant?: string
  price?: number
  quantity?: number
  list_name?: string
  list_position?: number
  creative_name?: string
  creative_slot?: string
  location_id?: string
  [key: string]: any
}

export interface BingUetPromotion {
  id?: string
  name?: string
  creative_name?: string
  creative_slot?: string
  [key: string]: any
}

export interface BingUetEventParams {
  /** Event category (beacon shortcut). */
  ec?: string
  /** Event action (beacon shortcut). */
  ea?: string
  /** Event label (beacon shortcut). */
  el?: string
  /** Event value, numeric (beacon shortcut). */
  ev?: number
  /** Goal category / goal completion. */
  gc?: string
  /** Goal value. */
  gv?: number
  /** Long-form alias for `ec`. */
  event_category?: string
  /** Long-form alias for `ea`. */
  event_action?: string
  /** Long-form alias for `el`. */
  event_label?: string
  /** Long-form alias for `ev`. */
  event_value?: number
  /** Unique event identifier (dedup). */
  event_id?: string
  /** Variable revenue amount. */
  revenue_value?: number
  /** ISO 4217 currency code (e.g. "USD"). */
  currency?: string
  /** Unique order/transaction ID (dedup). */
  transaction_id?: string
  /** Ecommerce items. */
  items?: BingUetItem[]
  /** Promotions associated with the event. */
  promotions?: BingUetPromotion[]
  /** Sign-up/login method (e.g. "Google"). */
  method?: string
  coupon?: string
  tax?: number
  shipping?: number
  affiliation?: string
  /** Search query. */
  search_term?: string
  content_type?: string
  content_id?: string
  checkout_step?: number
  checkout_option?: string
  description?: string
  name?: string
  screen_name?: string
  /** Whether an exception is fatal. */
  fatal?: boolean
  /** Flags a new customer conversion. */
  new_customer?: boolean | number
  /** Retail vertical: product ID. */
  ecomm_prodid?: string | string[]
  /** Retail vertical: page type. */
  ecomm_pagetype?: 'home' | 'searchresults' | 'category' | 'product' | 'cart' | 'purchase' | 'other' | (string & {})
  ecomm_totalvalue?: number
  ecomm_category?: string | string[]
  ecomm_query?: string
  /** Override page path. */
  page_path?: string
  /** Override page title. */
  page_title?: string
  /** Override full page URL. */
  page_location?: string
  [key: string]: any
}

export interface BingUetEnhancedConversionsPid {
  /** SHA-256 hashed email (lowercase, trimmed). Alias: `email`. */
  em?: string
  /** SHA-256 hashed phone (E.164 digits only). Alias: `phone_number`. */
  ph?: string
  /** Long-form alias for `em`. */
  email?: string
  /** Long-form alias for `ph`. */
  phone_number?: string
  [key: string]: any
}

export interface BingUetSetParams {
  /** Partner identifiers for enhanced conversions. */
  pid?: BingUetEnhancedConversionsPid
  page_path?: string
  page_title?: string
  page_location?: string
  [key: string]: any
}

export interface BingUetTcfConfig {
  /** Enable TCF v2.0 auto-consent handling (Microsoft vendorId 1126). */
  enabled?: boolean
  [key: string]: any
}

export interface BingUetConstructorOptions {
  /** UET tag ID. */
  ti: string
  /** Alternate tag ID field (same effect as `ti`). */
  tagId?: string
  /** Auto-fire pageLoad on SPA route changes. */
  enableAutoSpaTracking?: boolean
  /** Enable TCF v2.0 auto-consent handling. */
  enableAutoConsent?: boolean
  /** Suppress automatic page_view on load. */
  disableAutoPageView?: boolean
  /** Disable the UET container entirely. */
  disableContainer?: boolean
  /** Disable writing the UET visitor ID cookie. */
  disableUetVid?: boolean
  /** Disable visibility (tab focus/blur) events. */
  disableVisibilityEvents?: boolean
  /** Defer loading the beacon. */
  deferLoad?: boolean
  /** Strip query strings from reported URLs. */
  removeQueryFromUrls?: boolean
  /** Store conversion tracking cookies. */
  storeConvTrackCookies?: boolean
  /** Cookie domain. */
  cookieDomain?: string
  /** Cookie flags (e.g. "SameSite=None; Secure"). */
  cookieFlags?: string
  /** Enable MS DNS cookie. */
  msDnsCookie?: boolean
  /** UID cookie name. */
  uidCookie?: string
  /** Error beacon verbosity level. */
  errorBeaconLevel?: number
  /** Microsoft Clarity project ID for integration. */
  clarityProjectId?: string
  /** When true, reads `window.enhanced_conversion_data` for gtag-style enhanced conversions. */
  gtagPid?: boolean
  /** Beacon protocol version. */
  Ver?: 1 | 2
  /** Associated advertiser ID. */
  advertiserId?: string
  /** Source tag for GTM integration. */
  gtmTagSource?: string
  /** Queue reference, typically `window.uetq`. */
  q?: any[]
  [key: string]: any
}

export interface BingUetQueue {
  push: {
    // Legacy custom event object form (beacon shortcuts).
    (event: BingUetEventParams): void
    // Manual page load (maps internally to `page_view`).
    (command: 'pageLoad'): void
    // Standard and custom events.
    (command: 'event', eventName: BingUetEventName, eventParams?: BingUetEventParams): void
    // Consent mode (default on init, update after user interaction).
    (command: 'consent', action: 'default' | 'update', consentParams: BingUetConsentOptions): void
    // Enhanced conversions / sticky page overrides.
    (command: 'set', params: BingUetSetParams): void
    // TCF v2.0 auto-consent configuration.
    (command: 'config', target: 'tcf', params: BingUetTcfConfig): void
  }
}

export interface BingUetApi {
  uetq: BingUetQueue
}

declare global {
  interface Window {
    UET: new (options: BingUetConstructorOptions) => BingUetQueue
    uetq: any[] | BingUetQueue
  }
}

export interface BingUetConsent {
  /** Push `['consent','update', state]` with the `ad_storage` signal. */
  update: (state: BingUetConsentOptions) => void
}

export function useScriptBingUet<T extends BingUetApi>(_options?: BingUetInput & { onBeforeUetStart?: (uetq: BingUetQueue) => void }): UseScriptContext<T, BingUetConsent> {
  const instance = useRegistryScript<T, typeof BingUetOptions>('bingUet', options => ({
    scriptInput: {
      src: 'https://bat.bing.com/bat.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? BingUetOptions : undefined,
    scriptOptions: {
      use() {
        // After bat.js loads, initialize UET if not already done
        if (options?.id && typeof window.UET === 'function' && Array.isArray(window.uetq)) {
          const uetOptions = {
            ti: options.id,
            enableAutoSpaTracking: options.enableAutoSpaTracking ?? true,
            q: window.uetq as any[],
          }
          window.uetq = new window.UET(uetOptions)
          window.uetq.push('pageLoad')
        }
        return { uetq: window.uetq }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const uetq = window.uetq || []
          window.uetq = uetq
          if (options?.defaultConsent) {
            (uetq as unknown as BingUetQueue).push('consent', 'default', options.defaultConsent)
          }
          _options?.onBeforeUetStart?.(uetq as unknown as BingUetQueue)
        },
  }), _options) as UseScriptContext<T, BingUetConsent>

  if (import.meta.client && !instance.consent) {
    instance.consent = {
      update: (state: BingUetConsentOptions) => {
        ;((instance.proxy as unknown as BingUetApi).uetq as any).push('consent', 'update', state)
      },
    }
  }
  return instance
}
