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

/**
 * The deferred methods TikTok's base code installs on `ttq`. Calling one before
 * `events.js` loads pushes a `[method, ...args]` tuple onto the queue; afterwards
 * `events.js` rebinds them to live implementations.
 */
export interface TtqInstance {
  /** Track a page view. */
  page: () => void
  /** Track a standard or custom conversion event. */
  track: (event: StandardEvents | (string & {}), properties?: EventProperties, options?: TrackOptions) => void
  /** Associate advanced-matching identifiers with the current user. */
  identify: (properties: IdentifyProperties) => void
  /** Opt user in to tracking. Queued before the script loads; live once `events.js` binds. */
  grantConsent: () => void
  /** Opt user out of tracking. Queued before the script loads; live once `events.js` binds. */
  revokeConsent: () => void
  /** Defer consent until an explicit grant/revoke. Queued before the script loads; live once `events.js` binds. */
  holdConsent: () => void
  enableCookie: () => void
  disableCookie: () => void
}

/**
 * Legacy callable signature. Pre-1.2 `useScriptTikTokPixel` exposed `ttq` as an
 * `fbq`-style callable (`ttq('page')`, `ttq('track', …)`); the adapter keeps it
 * working alongside the method form.
 */
type TtqCallable
  = ((cmd: 'track', event: StandardEvents | (string & {}), properties?: EventProperties, options?: TrackOptions) => void)
    & ((cmd: 'page') => void)
    & ((cmd: 'identify', properties: IdentifyProperties) => void)
    & ((cmd: (string & {}), ...args: any[]) => void)

/**
 * The public `ttq` returned by the composable: a callable adapter (legacy form)
 * that also carries the deferred methods (`ttq.page()`, `ttq.track(…)`). The
 * adapter forwards to `window.ttq`, which is TikTok's real array protocol.
 */
export type Ttq = TtqCallable & TtqInstance & {
  /** Resolve the per-pixel method bag for a specific pixel id. */
  instance: (id: string) => TtqInstance
}

export interface TikTokPixelApi {
  ttq: Ttq
}

/**
 * TikTok's `window.ttq` is an Array, not a callable: `events.js` reads it as a
 * queue of `[method, ...args]` tuples and replays them, with the deferred
 * methods installed as own properties on the array.
 */
type TtqArray = TtqInstance & Array<any[]> & {
  methods: string[]
  setAndDefer: (target: any, method: string) => void
  instance: (id: string) => TtqInstance
  _i?: Record<string, any[]>
  _t?: Record<string, number>
  _o?: Record<string, any>
}

declare global {
  interface Window {
    ttq: TtqArray
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

// The deferred-method names TikTok's base code defers onto `ttq`.
const TTQ_METHODS = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent']

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

/**
 * Build the callable adapter returned to consumers. It dispatches to the live
 * `window.ttq` array on every call, so it tracks `events.js` rebinding the
 * deferred methods. Supports both `ttq('page')` (legacy) and `ttq.page()`.
 */
function createTtqAdapter(): Ttq {
  const dispatch = (method: string, ...args: any[]) => {
    if (import.meta.dev && method === 'identify' && args[0])
      warnUnhashedIdentify(args[0])
    return (window.ttq as any)[method]?.(...args)
  }
  const adapter = ((method: string, ...args: any[]) => dispatch(method, ...args)) as Ttq
  for (const method of [...TTQ_METHODS, 'instance'])
    (adapter as any)[method] = (...args: any[]) => dispatch(method, ...args)
  return adapter
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
        return { ttq: createTtqAdapter() }
      },
    },
    // TikTok's `events.js` consumes the official array-based snippet protocol:
    // `window.ttq` is an Array of `[method, ...args]` tuples that `events.js`
    // drains once loaded. (It does NOT understand the Facebook `fbq` callable
    // protocol — using that shape silently drops every browser Pixel event.)
    clientInit: import.meta.server
      ? undefined
      : () => {
          window.TiktokAnalyticsObject = 'ttq'
          const ttq = (window.ttq = window.ttq || ([] as unknown as TtqArray))
          ttq.methods = TTQ_METHODS
          ttq.setAndDefer = function (target: any, method: string) {
            target[method] = function (...args: any[]) {
              target.push([method, ...args])
            }
          }
          for (const method of ttq.methods)
            ttq.setAndDefer(ttq, method)
          ttq.instance = function (id: string) {
            const bag = ttq._i?.[id] || []
            for (const method of ttq.methods)
              ttq.setAndDefer(bag, method)
            return bag as unknown as TtqInstance
          }
          if (options?.id) {
            // Per-pixel scaffolding read by `events.js` (equivalent to the base
            // code's `ttq.load(id)`, minus the <script> insertion that the
            // registry script tag already handles).
            ttq._i = ttq._i || {}
            ttq._i[options.id] = ttq._i[options.id] || []
            ;(ttq._i[options.id] as any)._u = tiktokPixelSrc(options?.region)
            ttq._t = ttq._t || {}
            ttq._t[options.id] = Date.now()
            ttq._o = ttq._o || {}
            ttq._o[options.id] = {}
            if (options?.defaultConsent === 'granted')
              ttq.grantConsent()
            else if (options?.defaultConsent === 'denied')
              ttq.revokeConsent()
            else if (options?.defaultConsent === 'hold')
              ttq.holdConsent()
            if (options?.trackPageView !== false)
              ttq.page()
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
