import type { ConsentAdapter, RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { MetaPixelOptions } from './schemas'

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
  status?: 'completed' | 'updated' | 'viewed' | 'added_to_cart' | 'removed_from_cart' | (string & {})
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

export { MetaPixelOptions }
export type MetaPixelInput = RegistryScriptInput<typeof MetaPixelOptions, true, false>

function applyMetaConsent(state: { ad_storage?: 'granted' | 'denied' }, proxy: MetaPixelApi) {
  if (!state.ad_storage)
    return
  proxy.fbq('consent', state.ad_storage === 'granted' ? 'grant' : 'revoke')
}

/**
 * GCMv2 -> Meta Pixel consent adapter.
 * Meta only exposes a binary consent toggle, projected lossy from `ad_storage`:
 * - `ad_storage === 'granted'` -> `fbq('consent', 'grant')`
 * - `ad_storage === 'denied'`  -> `fbq('consent', 'revoke')`
 * - other GCM categories are ignored.
 */
export const metaPixelConsentAdapter: ConsentAdapter<MetaPixelApi> = {
  applyDefault: applyMetaConsent,
  applyUpdate: applyMetaConsent,
}

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
          if (options?.defaultConsent)
            fbq('consent', options.defaultConsent === 'granted' ? 'grant' : 'revoke')
          fbq('init', options?.id)
          fbq('track', 'PageView')
        },
  }), _options)
}
