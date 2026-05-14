import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { withQuery } from 'ufo'
import { logger } from '../logger'
import { useRegistryScript } from '../utils'
import { TikTokPixelOptions } from './schemas'

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
    | 'Purchase'
    | 'Contact'
    | 'Download'
    | 'SubmitForm'
    | 'CompleteRegistration'
    | 'Subscribe'
    | 'StartTrial'
    | 'ApplicationApproval'
    | 'CustomizeProduct'
    | 'FindLocation'
    | 'Schedule'
    | 'SubmitApplication'

interface EventProperties {
  content_id?: string
  content_type?: string
  content_name?: string
  contents?: Array<{ content_id: string, content_type?: string, content_name?: string, price?: number, quantity?: number }>
  currency?: string
  value?: number
  description?: string
  query?: string
  /** Order/transaction identifier; complements `event_id` for transaction-level dedup. */
  order_id?: string
  [key: string]: any
}

/**
 * Advanced matching parameters. TikTok requires SHA-256-hashed values for `email`,
 * `phone_number`, `external_id`, and the name/address fields to enable matching.
 * Passing raw values disables matching silently; a dev-mode warning is logged.
 * @see https://business-api.tiktok.com/portal/docs?id=1739585702922241
 */
interface IdentifyProperties {
  email?: string
  phone_number?: string
  external_id?: string
  first_name?: string
  last_name?: string
  city?: string
  state?: string
  country?: string
  zip_code?: string
}

interface TrackOptions {
  /** Used to deduplicate events sent from both the browser Pixel and the server-side Events API. */
  event_id?: string
  /**
   * Sandbox test-event identifier. When set, events route to TikTok's Test Events panel
   * without affecting production reporting.
   */
  test_event_code?: string
  [key: string]: any
}

type TtqFns
  = ((cmd: 'track', event: StandardEvents | (string & {}), properties?: EventProperties, options?: TrackOptions) => void)
    & ((cmd: 'page') => void)
    & ((cmd: 'identify', properties: IdentifyProperties) => void)
    & ((cmd: (string & {}), ...args: any[]) => void)

export interface TikTokPixelApi {
  ttq: TtqFns & {
    push: TtqFns
    loaded: boolean
    queue: any[]
    /** Opt user in to tracking. Queued before the script loads; live once `events.js` binds. */
    grantConsent: () => void
    /** Opt user out of tracking. Queued before the script loads; live once `events.js` binds. */
    revokeConsent: () => void
    /** Defer consent until an explicit grant/revoke. Queued before the script loads; live once `events.js` binds. */
    holdConsent: () => void
  }
}

declare global {
  interface Window extends TikTokPixelApi {
    TiktokAnalyticsObject: string
  }
}

export { TikTokPixelOptions }

export type TikTokPixelInput = RegistryScriptInput<typeof TikTokPixelOptions, true, false>

/** Resolve the Pixel SDK URL for a given data-residency region. */
export function tiktokPixelSrc(region?: 'global' | 'us'): string {
  return region === 'us'
    ? 'https://analytics.us.tiktok.com/i18n/pixel/events.js'
    : 'https://analytics.tiktok.com/i18n/pixel/events.js'
}

const SHA256_HEX = /^[a-f0-9]{64}$/i

function warnUnhashedIdentify(props: Record<string, unknown>): void {
  const hashFields = ['email', 'phone_number', 'external_id', 'first_name', 'last_name', 'city', 'state', 'country', 'zip_code']
  const offenders = hashFields.filter((f) => {
    const v = props[f]
    return typeof v === 'string' && v.length > 0 && !SHA256_HEX.test(v)
  })
  if (offenders.length) {
    logger.withTag('tiktokPixel').warn(`identify() received unhashed value(s) for ${offenders.join(', ')}. TikTok requires SHA-256 hashing for advanced matching; raw values will be ignored. See https://business-api.tiktok.com/portal/docs?id=1739585702922241`)
  }
}

export interface TikTokPixelConsent {
  /** Call `ttq.grantConsent()`. */
  grant: () => void
  /** Call `ttq.revokeConsent()`. */
  revoke: () => void
  /** Call `ttq.holdConsent()` to defer the decision. */
  hold: () => void
}

export function useScriptTikTokPixel<T extends TikTokPixelApi>(_options?: TikTokPixelInput): UseScriptContext<T, TikTokPixelConsent> {
  const instance = useRegistryScript<T, typeof TikTokPixelOptions>('tiktokPixel', options => ({
    scriptInput: {
      src: withQuery(tiktokPixelSrc(options?.region), {
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
          window.TiktokAnalyticsObject = 'ttq'
          const ttq: TikTokPixelApi['ttq'] = window.ttq = function (...params: any[]) {
            if (import.meta.dev && params[0] === 'identify' && params[1])
              warnUnhashedIdentify(params[1])
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
          // Queue consent stubs so pre-load `ttq.grantConsent()` / `ttq.revokeConsent()` work.
          // The real events.js replaces these with live bindings once loaded.
          const consentMethods = ['grantConsent', 'revokeConsent', 'holdConsent'] as const
          for (const name of consentMethods) {
            ;(ttq as any)[name] = function (...params: any[]) {
              ttq.queue.push([name, ...params])
            }
          }
          if (options?.defaultConsent === 'granted')
            ttq.grantConsent()
          else if (options?.defaultConsent === 'denied')
            ttq.revokeConsent()
          else if (options?.defaultConsent === 'hold')
            ttq.holdConsent()
          if (options?.id) {
            ttq('init', options.id)
            if (options?.trackPageView !== false) {
              ttq('page')
            }
          }
        },
  }), _options) as UseScriptContext<T, TikTokPixelConsent>

  if (import.meta.client && !instance.consent) {
    instance.consent = {
      grant: () => (instance.proxy as unknown as TikTokPixelApi).ttq.grantConsent(),
      revoke: () => (instance.proxy as unknown as TikTokPixelApi).ttq.revokeConsent(),
      hold: () => (instance.proxy as unknown as TikTokPixelApi).ttq.holdConsent(),
    }
  }
  return instance
}
