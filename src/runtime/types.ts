import type {
  Script,
} from '@unhead/vue/types'
import type { UseScriptInput, VueScriptInstance, UseScriptOptions } from '@unhead/vue'
import type { ComputedRef, Ref } from 'vue'
import type { InferInput, ObjectSchema } from 'valibot'
import type { Import } from 'unimport'
import type { SegmentInput } from './registry/segment'
import type { CloudflareWebAnalyticsInput } from './registry/cloudflare-web-analytics'
import type { MetaPixelInput } from './registry/meta-pixel'
import type { FathomAnalyticsInput } from './registry/fathom-analytics'
import type { HotjarInput } from './registry/hotjar'
import type { IntercomInput } from './registry/intercom'
import type { GoogleMapsInput } from './registry/google-maps'
import type { MatomoAnalyticsInput } from './registry/matomo-analytics'
import type { StripeInput } from './registry/stripe'
import type { VimeoPlayerInput } from './registry/vimeo-player'
import type { XPixelInput } from './registry/x-pixel'
import type { SnapTrPixelInput } from './registry/snapchat-pixel'
import type { YouTubePlayerInput } from './registry/youtube-player'
import type { PlausibleAnalyticsInput } from './registry/plausible-analytics'
import type { NpmInput } from './registry/npm'
import type { LemonSqueezyInput } from './registry/lemon-squeezy'
import type { GoogleAdsenseInput } from './registry/google-adsense'
import type { ClarityInput } from './registry/clarity'
import type { CrispInput } from './registry/crisp'
import type { GoogleAnalyticsInput } from './registry/google-analytics'
import type { GoogleTagManagerInput } from './registry/google-tag-manager'
import type { UmamiAnalyticsInput } from './registry/umami-analytics'
import type { RybbitAnalyticsInput } from './registry/rybbit-analytics'
import { object } from '#nuxt-scripts-validator'

export type WarmupStrategy = false | 'preload' | 'preconnect' | 'dns-prefetch'

export type UseScriptContext<T extends Record<symbol | string, any>> = VueScriptInstance<T>

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
   * - `false` - Do not bundle the script. (default)
   */
  bundle?: boolean
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
  performanceMarkFeature?: string
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
  }
}

export type NuxtUseScriptOptionsSerializable = Omit<NuxtUseScriptOptions, 'use' | 'skipValidation' | 'stub' | 'trigger' | 'eventContext' | 'beforeInit'> & { trigger?: 'client' | 'server' | 'onNuxtReady' }

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

export interface NuxtDevToolsScriptInstance {
  registryKey?: string
  registryMeta?: Record<string, string>
  src: string
  $script: VueScriptInstance<any>
  events: {
    type: string
    fn?: string | symbol
    args?: any
    status?: string
    trigger?: NuxtUseScriptOptions['trigger']
    at: number
  }[]
}

export interface ScriptRegistry {
  crisp?: CrispInput
  clarity?: ClarityInput
  cloudflareWebAnalytics?: CloudflareWebAnalyticsInput
  metaPixel?: MetaPixelInput
  fathomAnalytics?: FathomAnalyticsInput
  plausibleAnalytics?: PlausibleAnalyticsInput
  googleAdsense?: GoogleAdsenseInput
  googleAnalytics?: GoogleAnalyticsInput
  googleMaps?: GoogleMapsInput
  lemonSqueezy?: LemonSqueezyInput
  googleTagManager?: GoogleTagManagerInput
  hotjar?: HotjarInput
  intercom?: IntercomInput
  matomoAnalytics?: MatomoAnalyticsInput
  rybbitAnalytics?: RybbitAnalyticsInput
  segment?: SegmentInput
  stripe?: StripeInput
  xPixel?: XPixelInput
  snapchatPixel?: SnapTrPixelInput
  youtubePlayer?: YouTubePlayerInput
  vimeoPlayer?: VimeoPlayerInput
  umamiAnalytics?: UmamiAnalyticsInput
  [key: `${string}-npm`]: NpmInput
}

export type NuxtConfigScriptRegistryEntry<T> = true | 'mock' | T | [T, NuxtUseScriptOptionsSerializable]
export type NuxtConfigScriptRegistry<T extends keyof ScriptRegistry = keyof ScriptRegistry> = Partial<{
  [key in T]: NuxtConfigScriptRegistryEntry<ScriptRegistry[key]>
}>

export type UseFunctionType<T, U> = T extends {
  use: infer V
} ? V extends (...args: any) => any ? ReturnType<V> : U : U

const _emptyOptions = object({})

export type EmptyOptionsSchema = typeof _emptyOptions

type ScriptInput = Script

export type InferIfSchema<T> = T extends ObjectSchema<any, any> ? InferInput<T> : T
export type RegistryScriptInput<
  T = EmptyOptionsSchema,
  Bundelable extends boolean = true,
  Usable extends boolean = false,
  CanBypassOptions extends boolean = true,
>
  = (InferIfSchema<T>
    & {
      /**
       * A unique key to use for the script, this can be used to load multiple of the same script with different options.
       */
      key?: string
      scriptInput?: ScriptInput
      scriptOptions?: Omit<NuxtUseScriptOptions, Bundelable extends true ? '' : 'bundle' | Usable extends true ? '' : 'use'>
    })
    | Partial<InferIfSchema<T>> & (
      CanBypassOptions extends true ? {
      /**
       * A unique key to use for the script, this can be used to load multiple of the same script with different options.
       */
        key?: string
        scriptInput: Required<Pick<ScriptInput, 'src'>> & ScriptInput
        scriptOptions?: Omit<NuxtUseScriptOptions, Bundelable extends true ? '' : 'bundle' | Usable extends true ? '' : 'use'>
      } : never)

export interface RegistryScript {
  import?: Import // might just be a component
  scriptBundling?: false | ((options?: any) => string | false)
  label?: string
  src?: string | false
  category?: string
  logo?: string | { light: string, dark: string }
}

export type ElementScriptTrigger = 'immediate' | 'visible' | string | string[] | false

export type RegistryScripts = RegistryScript[]
