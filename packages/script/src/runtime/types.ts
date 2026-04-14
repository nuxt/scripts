import type { UseScriptInput, UseScriptOptions, VueScriptInstance } from '@unhead/vue'
import type {
  Script,
} from '@unhead/vue/types'
import type { Import } from 'unimport'
import type { InferInput, ObjectEntries, ObjectSchema, UnionSchema, ValiError } from 'valibot'
import type { ComputedRef, Ref } from 'vue'
import type { BingUetInput } from './registry/bing-uet'
import type { BlueskyEmbedInput } from './registry/bluesky-embed'
import type { ClarityInput } from './registry/clarity'
import type { CloudflareWebAnalyticsInput } from './registry/cloudflare-web-analytics'
import type { CrispInput } from './registry/crisp'
import type { DatabuddyAnalyticsInput } from './registry/databuddy-analytics'
import type { FathomAnalyticsInput } from './registry/fathom-analytics'
import type { GoogleAdsenseInput } from './registry/google-adsense'
import type { GoogleAnalyticsInput } from './registry/google-analytics'
import type { GoogleMapsInput } from './registry/google-maps'
import type { GoogleRecaptchaInput } from './registry/google-recaptcha'
import type { GoogleSignInInput } from './registry/google-sign-in'
import type { GoogleTagManagerInput } from './registry/google-tag-manager'
import type { GravatarInput } from './registry/gravatar'
import type { HotjarInput } from './registry/hotjar'
import type { InstagramEmbedInput } from './registry/instagram-embed'
import type { IntercomInput } from './registry/intercom'
import type { LemonSqueezyInput } from './registry/lemon-squeezy'
import type { MatomoAnalyticsInput } from './registry/matomo-analytics'
import type { MetaPixelInput } from './registry/meta-pixel'
import type { MixpanelAnalyticsInput } from './registry/mixpanel-analytics'
import type { NpmInput } from './registry/npm'
import type { PayPalInput } from './registry/paypal'
import type { PlausibleAnalyticsInput } from './registry/plausible-analytics'
import type { PostHogInput } from './registry/posthog'
import type { RedditPixelInput } from './registry/reddit-pixel'
import type { RybbitAnalyticsInput } from './registry/rybbit-analytics'
import type { SegmentInput } from './registry/segment'
import type { SnapTrPixelInput } from './registry/snapchat-pixel'
import type { StripeInput } from './registry/stripe'
import type { TikTokPixelInput } from './registry/tiktok-pixel'
import type { UmamiAnalyticsInput } from './registry/umami-analytics'
import type { VercelAnalyticsInput } from './registry/vercel-analytics'
import type { VimeoPlayerInput } from './registry/vimeo-player'
import type { XEmbedInput } from './registry/x-embed'
import type { XPixelInput } from './registry/x-pixel'
import type { YouTubePlayerInput } from './registry/youtube-player'
import type { ProxyPrivacyInput } from './server/utils/privacy'

// Google Maps component types (re-exported for easy user access)
export type { Cluster, ClusterStats, MarkerClustererContext, MarkerClustererInstance, MarkerClustererOptions } from './components/GoogleMaps/types'
export { MARKER_CLUSTERER_INJECTION_KEY } from './components/GoogleMaps/types'

export type WarmupStrategy = false | 'preload' | 'preconnect' | 'dns-prefetch'

// -- Consent adapter contract --

/**
 * GCMv2 consent category value.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export type ConsentCategoryValue = 'granted' | 'denied'

/**
 * Canonical GCMv2 consent state shape shared across all scripts.
 * Non-GCM vendors (Meta, TikTok, Matomo, Mixpanel, PostHog) project a subset via their adapters.
 */
export interface ConsentState {
  ad_storage?: ConsentCategoryValue
  ad_user_data?: ConsentCategoryValue
  ad_personalization?: ConsentCategoryValue
  analytics_storage?: ConsentCategoryValue
  functionality_storage?: ConsentCategoryValue
  personalization_storage?: ConsentCategoryValue
  security_storage?: ConsentCategoryValue
}

/**
 * Adapter that maps a canonical GCMv2 ConsentState to a vendor's consent API.
 * Consumed by the `useScriptConsent` composable so call sites apply GCM-style
 * state without caring whether the vendor uses `gtag('consent', ...)`,
 * `_paq.push`, `mixpanel.opt_in_tracking()`, etc.
 */
export interface ConsentAdapter<Proxy = any> {
  /** Called once before the vendor init call to establish default consent. */
  applyDefault: (state: ConsentState, proxy: Proxy) => void
  /** Called on every consent update after the script has loaded. */
  applyUpdate: (state: ConsentState, proxy: Proxy) => void
}

export type UseScriptContext<T extends Record<symbol | string, any>> = VueScriptInstance<T> & {
  /**
   * Remove and reload the script. Useful for scripts that need to re-execute
   * after SPA navigation (e.g., DOM-scanning scripts like iubenda).
   */
  reload: () => Promise<T>
}

export type NuxtUseScriptOptions<T extends Record<symbol | string, any> = {}> = Omit<UseScriptOptions<T>, 'trigger'> & {
  /**
   * The trigger to load the script:
   * - `onNuxtReady` - Load the script when Nuxt is ready.
   * - `manual` - Load the script manually by calling `load()`.
   * - `Promise` - Load the script when the promise resolves.
   */
  trigger?: UseScriptOptions<T>['trigger'] | 'onNuxtReady'
  /**
   * Should the script be bundled as an asset and loaded from your server. This is useful for improving the
   * performance by avoiding the extra DNS lookup and reducing the number of requests. It also
   * improves privacy by not sharing the user's IP address with third-party servers.
   * - `true` - Bundle the script as an asset.
   * - `'force'` - Bundle the script and force download, bypassing cache. Useful for development.
   * - `false` - Do not bundle the script. (default)
   *
   * Note: Using 'force' may significantly increase build time as scripts will be re-downloaded on every build.
   *
   * @deprecated Bundling is now auto-enabled per-script via capabilities. Set `bundle: false` per-script to disable.
   */
  bundle?: boolean | 'force'
  /**
   * Control proxying for this script.
   * When `false`, collection requests go directly to the third-party server.
   * When `true`, collection requests are proxied through `/_scripts/p/`.
   * Defaults based on whether the script has a `proxy` capability in the registry.
   */
  proxy?: boolean
  /**
   * Load the script in a web worker using Partytown.
   * When enabled, adds `type="text/partytown"` to the script tag.
   * Requires @nuxtjs/partytown to be installed and configured separately.
   * @see https://partytown.qwik.dev/
   */
  partytown?: boolean
  /**
   * Skip any schema validation for the script input. This is useful for loading the script stubs for development without
   * loading the actual script and not getting warnings.
   */
  skipValidation?: boolean
  /**
   * Specify a strategy for warming up the connection to the third-party script.
   *
   * The strategy to use for preloading the script.
   *  - `false` - Disable preloading.
   *  - `'preload'` - Preload the script.
   *  - `'preconnect'` | `'dns-prefetch'` - Preconnect to the script. Only works when loading a script from a different origin, will fallback
   *  to `false` if the origin is the same.
   */
  warmupStrategy?: WarmupStrategy
  /**
   * @internal
   */
  devtools?: {
    /**
     * Key used to map to the registry script for Nuxt DevTools.
     * @internal
     */
    registryKey?: string
    /**
     * Extra metadata to show with the registry script
     * @internal
     */
    registryMeta?: Record<string, string>
    /**
     * Known third-party domains this script communicates with.
     * @internal
     */
    domains?: string[]
  }
  /**
   * Unified consent control for this script.
   *
   * Pass a `useScriptConsent` instance to gate loading behind user consent and, when the script
   * declares a `consentAdapter`, auto-subscribe it for granular Google Consent Mode v2 fan-out.
   *
   * Also accepts the legacy `useScriptTriggerConsent` return value for backwards compatibility,
   * in which case only the binary load gate is used.
   */
  consent?: {
    accept: () => void
    revoke: () => void
    consented: Ref<boolean>
    state?: Ref<ConsentState>
    update?: (partial: ConsentState) => void
    register?: <P = any>(adapter: ConsentAdapter<P>, proxy: P) => () => void
  } & Promise<void>
  /**
   * Consent adapter declared by the registry entry. Auto-populated by registry wrappers
   * via `scriptOptions._consentAdapter`.
   *
   * @internal
   */
  _consentAdapter?: ConsentAdapter<any>
  /**
   * @internal
   */
  _validate?: () => ValiError<any> | null | undefined
}

export type NuxtUseScriptOptionsSerializable = Omit<NuxtUseScriptOptions, 'use' | 'skipValidation' | 'stub' | 'trigger' | 'eventContext' | 'beforeInit'> & { trigger?: 'client' | 'server' | 'onNuxtReady' | { idleTimeout: number } | { interaction: string[] } | { serviceWorker: true } }

export type NuxtUseScriptInput = UseScriptInput

export interface TrackedPage {
  title?: string
  path: string
}

type ExcludePromises<T> = T extends Promise<any> ? never : T

export interface ConsentScriptTriggerOptions {
  /**
   * An optional reactive (or promise) reference to the consent state. You can use this to accept the consent for scripts
   * instead of using the accept() method.
   */
  consent?: Promise<boolean | void> | Ref<boolean> | ComputedRef<boolean> | boolean
  /**
   * Should the script be loaded on the `requestIdleCallback` callback. This is useful for non-essential scripts that
   * have already been consented to be loaded.
   */
  postConsentTrigger?: ExcludePromises<NuxtUseScriptOptions['trigger']> | (() => Promise<any>)
}

/**
 * Google Consent Mode v2 category value.
 */
export type ConsentCategoryValue = 'granted' | 'denied'

/**
 * Google Consent Mode v2 consent state.
 *
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export interface ConsentState {
  ad_storage?: ConsentCategoryValue
  ad_user_data?: ConsentCategoryValue
  ad_personalization?: ConsentCategoryValue
  analytics_storage?: ConsentCategoryValue
  functionality_storage?: ConsentCategoryValue
  personalization_storage?: ConsentCategoryValue
  security_storage?: ConsentCategoryValue
}

/**
 * Adapter contract that individual registry scripts implement so a unified
 * consent composable can fan out default and update events.
 *
 * `applyDefault` runs once before the SDK initializes (e.g. `gtag('consent', 'default', ...)`),
 * `applyUpdate` runs whenever the user updates any category.
 */
export interface ConsentAdapter<Proxy = any> {
  applyDefault: (state: ConsentState, proxy: Proxy) => void
  applyUpdate: (state: ConsentState, proxy: Proxy) => void
}

export interface UseScriptConsentOptions extends ConsentScriptTriggerOptions {
  /**
   * Initial consent state applied synchronously before any subscribed script loads.
   * Keys follow Google Consent Mode v2 categories.
   *
   * @example { ad_storage: 'denied', analytics_storage: 'denied' }
   */
  default?: ConsentState
}

export interface NuxtDevToolsNetworkRequest {
  url: string
  startTime: number
  duration: number
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  initiatorType: string
  dns: number
  connect: number
  ssl: number
  ttfb: number
  download: number
  isProxied: boolean
}

export interface NuxtDevToolsScriptInstance {
  registryKey?: string
  registryMeta?: Record<string, string>
  src: string
  domains?: string[]
  $script: VueScriptInstance<any>
  events: {
    type: string
    fn?: string | symbol
    args?: any
    status?: string
    trigger?: NuxtUseScriptOptions['trigger']
    at: number
  }[]
  networkRequests: NuxtDevToolsNetworkRequest[]
}

export interface ScriptRegistry {
  bingUet?: BingUetInput
  blueskyEmbed?: BlueskyEmbedInput
  carbonAds?: true
  crisp?: CrispInput
  clarity?: ClarityInput
  cloudflareWebAnalytics?: CloudflareWebAnalyticsInput
  databuddyAnalytics?: DatabuddyAnalyticsInput
  metaPixel?: MetaPixelInput
  fathomAnalytics?: FathomAnalyticsInput
  instagramEmbed?: InstagramEmbedInput
  plausibleAnalytics?: PlausibleAnalyticsInput
  googleAdsense?: GoogleAdsenseInput
  googleAnalytics?: GoogleAnalyticsInput
  googleMaps?: GoogleMapsInput
  googleRecaptcha?: GoogleRecaptchaInput
  googleSignIn?: GoogleSignInInput
  lemonSqueezy?: LemonSqueezyInput
  googleTagManager?: GoogleTagManagerInput
  hotjar?: HotjarInput
  intercom?: IntercomInput
  paypal?: PayPalInput
  posthog?: PostHogInput
  matomoAnalytics?: MatomoAnalyticsInput
  mixpanelAnalytics?: MixpanelAnalyticsInput
  rybbitAnalytics?: RybbitAnalyticsInput
  redditPixel?: RedditPixelInput
  segment?: SegmentInput
  stripe?: StripeInput
  tiktokPixel?: TikTokPixelInput
  xEmbed?: XEmbedInput
  xPixel?: XPixelInput
  snapchatPixel?: SnapTrPixelInput
  youtubePlayer?: YouTubePlayerInput
  vercelAnalytics?: VercelAnalyticsInput
  vimeoPlayer?: VimeoPlayerInput
  umamiAnalytics?: UmamiAnalyticsInput
  gravatar?: GravatarInput
  npm?: NpmInput
  [key: `${string}-npm`]: NpmInput
}

/**
 * Built-in registry script keys — not affected by module augmentation.
 * Use this to type-check records that must enumerate all built-in scripts (logos, meta, etc.).
 */
export type BuiltInRegistryScriptKey
  = | 'bingUet' | 'blueskyEmbed' | 'carbonAds' | 'crisp' | 'clarity' | 'cloudflareWebAnalytics'
    | 'databuddyAnalytics' | 'metaPixel' | 'fathomAnalytics' | 'instagramEmbed'
    | 'plausibleAnalytics' | 'googleAdsense' | 'googleAnalytics' | 'googleMaps'
    | 'googleRecaptcha' | 'googleSignIn' | 'lemonSqueezy' | 'googleTagManager'
    | 'hotjar' | 'intercom' | 'paypal' | 'posthog' | 'matomoAnalytics'
    | 'mixpanelAnalytics' | 'rybbitAnalytics' | 'redditPixel' | 'segment' | 'stripe' | 'tiktokPixel'
    | 'xEmbed' | 'xPixel' | 'snapchatPixel' | 'youtubePlayer' | 'vercelAnalytics'
    | 'vimeoPlayer' | 'umamiAnalytics' | 'gravatar' | 'npm'

/**
 * Union of all explicit registry script keys (excludes npm pattern).
 * Includes both built-in and augmented keys.
 */
export type RegistryScriptKey = Exclude<keyof ScriptRegistry, `${string}-npm`>

type RegistryConfigInput<T> = 0 extends 1 & T ? Record<string, any> : [T] extends [true] ? Record<string, never> : T

export type NuxtConfigScriptRegistryEntry<T> = true | false | 'mock' | (RegistryConfigInput<T> & { trigger?: NuxtUseScriptOptionsSerializable['trigger'] | false, proxy?: boolean, bundle?: boolean, partytown?: boolean, privacy?: ProxyPrivacyInput })

// Internal mapped type: derives config entry types from ScriptRegistry.
// Excludes the `${string}-npm` pattern since it's covered by the string index signature.
type _NuxtConfigScriptRegistryEntries = {
  [K in keyof ScriptRegistry as K extends `${string}-npm` ? never : K]?: NuxtConfigScriptRegistryEntry<ScriptRegistry[K]>
}

// Interface (not intersection) ensures IDE displays specific types for known keys.
// Explicit properties inherited via `extends` always take priority over the index
// signature, making this immune to catch-all type contamination.
// Augmenting ScriptRegistry automatically flows through to this type.
//
// The index signature uses `any` to satisfy TypeScript's constraint that all
// inherited properties must be subtypes of the index type. This is safe because
// in an interface, explicit properties always take priority over the index
// signature for property access.
export interface NuxtConfigScriptRegistry extends _NuxtConfigScriptRegistryEntries {
  [key: string]: any
}

export type UseFunctionType<T, U> = T extends {
  use: infer V
} ? V extends (...args: any) => any ? ReturnType<V> : U : U

export type EmptyOptionsSchema = ObjectSchema<ObjectEntries, undefined>

type ScriptInput = Script

export type InferIfSchema<T> = T extends ObjectSchema<any, any> | UnionSchema<any, any> ? InferInput<T> : T
export interface RegistryScriptInputExtras<Bundelable extends boolean = true, Usable extends boolean = false> {
  /**
   * A unique key to use for the script, this can be used to load multiple of the same script with different options.
   */
  key?: string
  scriptInput?: ScriptInput
  scriptOptions?: Omit<NuxtUseScriptOptions, Bundelable extends true ? '' : 'bundle' | Usable extends true ? '' : 'use'>
}

export type RegistryScriptInput<
  T = EmptyOptionsSchema,
  Bundelable extends boolean = true,
  Usable extends boolean = false,
> = Partial<InferIfSchema<T>> & RegistryScriptInputExtras<Bundelable, Usable>

export interface RegistryScriptServerHandler {
  route: string
  handler: string
  middleware?: boolean
  /**
   * Whether this handler verifies HMAC signatures via `withSigning()`.
   *
   * When any enabled script registers a handler with `requiresSigning: true`,
   * the module enforces that `NUXT_SCRIPTS_PROXY_SECRET` is set in production,
   * and the `/_scripts/sign` endpoint will accept this route as a signable path.
   */
  requiresSigning?: boolean
}

/**
 * Declares what optimization modes a script supports and what's active by default.
 * Each flag is an independent capability that must be explicitly opted into.
 */
export interface ScriptCapabilities {
  /** Script can be downloaded at build time and served from `/_scripts/assets/`. */
  bundle?: boolean
  /**
   * Collection requests can be proxied through `/_scripts/p/`.
   * When combined with `bundle`: AST URL rewriting + runtime intercept.
   * Without `bundle` (npm mode): autoInject sets SDK endpoint to proxy URL.
   */
  proxy?: boolean
  /** Script can run in a web worker via Partytown. */
  partytown?: boolean
}

/**
 * A third-party domain the script communicates with.
 * Used for proxy routing, AST rewriting, and connection warming (dns-prefetch/preconnect).
 */
export interface ScriptDomain {
  /** The domain hostname (e.g., 'www.google-analytics.com') */
  domain: string
  /**
   * Whether this domain is used lazily (e.g., only after user interaction or SDK initialization).
   * When `true`, connection warming uses `dns-prefetch` instead of `preconnect`.
   * @default false
   */
  lazy?: boolean
}

/**
 * Bundle capability config. When present, the script can be downloaded at
 * build time and served from `/_scripts/assets/`.
 */
export interface BundleCapability {
  /** Custom URL resolution. If omitted, the script's `src` is used. */
  resolve?: (options?: any) => string | false
}

/**
 * Proxy capability config. When present, collection requests can be
 * proxied through `/_scripts/p/`.
 * When combined with bundle: AST URL rewriting + runtime intercept.
 * Without bundle (npm/config mode): autoInject sets SDK endpoint to proxy URL.
 */
export interface ProxyCapability {
  /** Third-party domains this script communicates with. */
  domains: (string | ScriptDomain)[]
  /** Privacy controls for proxied requests. */
  privacy: import('../runtime/server/utils/privacy').ProxyPrivacyInput
  /** Auto-inject proxy endpoint into the script's SDK config. */
  autoInject?: ProxyAutoInject
  /** AST-level SDK patches applied during URL rewriting. */
  sdkPatches?: SdkPatch[]
}

/**
 * Declarative SDK patch applied during AST rewriting.
 * Replaces fragile regex-based postProcess with targeted AST visitors.
 */
export type SdkPatch
  /**
   * Neutralize self-hosted detection checks like `.indexOf("cdn.example.com") < 0`.
   * When a script is proxied, its src no longer contains the original CDN domain,
   * causing these checks to incorrectly detect "self-hosted" mode.
   * This patch makes such comparisons always evaluate to false.
   */
  = | { type: 'neutralize-domain-check' }
  /**
   * Replace `<expr>.split("<separator>")[0]` patterns used by SDKs that derive
   * their API host from `document.currentScript.src`. When bundled, the script src
   * changes, breaking this derivation. This patch replaces the expression with
   * the correct proxy path.
   */
    | { type: 'replace-src-split', separator: string, fromDomain: string, appendPath?: string }

/**
 * Partytown capability config. When present, the script can run in a
 * web worker via Partytown.
 */
export interface PartytownCapability {
  /** Global API forward declarations for Partytown. */
  forwards: string[]
}

export interface RegistryScript {
  /**
   * The config key used in `scripts.registry` in nuxt.config (e.g., 'googleAnalytics', 'plausibleAnalytics').
   * Used for direct lookup from config to script.
   */
  registryKey?: RegistryScriptKey
  import?: Import
  label?: string
  src?: string | false
  category?: string
  logo?: string | { light: string, dark: string }
  /** Server handlers (routes/middleware) to register when this script is enabled. */
  serverHandlers?: RegistryScriptServerHandler[]
  /** Valibot schema for the script's input options. */
  schema?: ObjectSchema<ObjectEntries, any>
  /** Default env var field names and values for NUXT_PUBLIC_SCRIPTS_<SCRIPT>_<KEY> resolution. */
  envDefaults?: Record<string, string>

  /**
   * Bundle capability. Script can be downloaded at build time and served locally.
   * - `true`: bundleable using the script's `src` URL
   * - `{ resolve }`: bundleable with a custom URL resolution function
   * - absent: not bundleable
   */
  bundle?: BundleCapability | true
  /**
   * Proxy capability. Collection requests are proxied through `/_scripts/p/`.
   * - `ProxyCapability`: proxy-capable with inline config (domains, privacy, etc.)
   * - `RegistryScriptKey` string: alias, inherits proxy config from the referenced script
   * - absent: not proxy-capable
   */
  proxy?: ProxyCapability | RegistryScriptKey
  /**
   * Partytown capability. Script can run in a web worker via Partytown.
   * - `PartytownCapability`: partytown-capable with forward declarations
   * - absent: not partytown-capable
   */
  partytown?: PartytownCapability
  /**
   * Consent adapter that maps canonical GCMv2 state to the vendor's native
   * consent API. Consumed by the `useScriptConsent` composable.
   */
  consentAdapter?: ConsentAdapter
}

export type ElementScriptTrigger = 'immediate' | 'visible' | string | string[] | false

export type RegistryScripts = RegistryScript[]

// -- Proxy types (used by bundling, AST rewriting, and proxy routing) --

export interface ProxyRewrite {
  /** Domain and path to match (e.g., 'www.google-analytics.com/g/collect') */
  from: string
  /** Local path to rewrite to (e.g., '/_scripts/p/ga/g/collect') */
  to: string
}

/**
 * Global privacy override for all proxied requests.
 *
 * By default (`undefined`), each script uses its own privacy controls declared in the registry.
 * Setting this overrides all per-script defaults:
 *
 * - `true`: full anonymization (IP, UA, language, screen, timezone, hardware)
 * - `false`: passthrough (still strips sensitive auth headers)
 * - `{ ip: false }`: selective override per flag
 */
export type FirstPartyPrivacy = ProxyPrivacyInput

/**
 * Auto-inject proxy endpoint into the script's SDK config.
 * Used by scripts that let you configure the collection endpoint (PostHog, Plausible, etc.).
 *
 * Simple form: `{ field, target }` where target is appended to proxyPrefix.
 * Complex form: `{ field, resolve }` for dynamic endpoint computation.
 */
export interface ProxyAutoInject {
  /** The config field name to set (e.g., 'apiHost', 'endpoint') */
  field: string
  /** Domain and path appended to proxyPrefix. Sugar for `resolve: (p) => p + '/' + target`. */
  target?: string
  /** Compute the proxy endpoint value from the proxyPrefix and script config. Use for dynamic logic (e.g., region-based endpoints). */
  resolve?: (proxyPrefix: string, config: Record<string, any>) => string
}

/**
 * Resolved auto-inject config with a guaranteed computeValue function.
 * Used in ProxyConfig output after normalization.
 */
export interface ResolvedProxyAutoInject {
  configField: string
  computeValue: (proxyPrefix: string, config: Record<string, any>) => string
}

/**
 * Proxy configuration for third-party scripts.
 * Each supported script declares its domains, privacy controls, and optional SDK-specific hooks.
 *
 * The AST rewriter derives rewrite rules automatically from domains:
 *   { from: domain, to: proxyPrefix + '/' + domain }
 *
 * The runtime intercept plugin catches any remaining dynamic URLs at the
 * fetch/sendBeacon/XHR/Image call site.
 */
export interface ProxyConfig {
  /** Third-party domains to proxy. AST rewrites are derived automatically. */
  domains: string[]
  /**
   * Per-script privacy controls. Each script declares what it needs.
   * - `true` (default) = full anonymize: IP, UA, language, screen, timezone, hardware fingerprints
   * - `false` = passthrough (still strips sensitive auth headers)
   * - `{ ip: false }` = selective (unset flags default to `false`)
   */
  privacy: ProxyPrivacyInput
  /** Auto-inject proxy endpoint config into the script's SDK options (resolved form) */
  autoInject?: ResolvedProxyAutoInject
  /** AST-level SDK patches applied during URL rewriting. */
  sdkPatches?: SdkPatch[]
}
