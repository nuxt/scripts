import type { UseScriptOptions, DataKeys, SchemaAugmentations, ScriptBase } from '@unhead/schema'
import type { UseScriptInput, VueScriptInstance, MaybeComputedRefEntriesOnly } from '@unhead/vue'
import type { ComputedRef, Ref } from 'vue'
import type { InferInput, ObjectSchema } from 'valibot'
import type { Import } from 'unimport'
import { object } from 'valibot'
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
import type { YouTubePlayerInput } from './registry/youtube-player'
import type { PlausibleAnalyticsInput } from './registry/plausible-analytics'
import type { NpmInput } from './registry/npm'
import type { LemonSqueezyInput } from './registry/lemon-squeezy'
import type { GoogleAdsenseInput } from './registry/google-adsense'
import type { ClarityInput } from './registry/clarity'
import type { CrispInput } from './registry/crisp'
import type { Input as GoogleTagManagerInput } from '#build/modules/nuxt-scripts-gtm'
import type { Input as GoogleAnalyticsInput } from '#build/modules/nuxt-scripts-ga'

export type NuxtUseScriptOptions<T = any> = Omit<UseScriptOptions<T>, 'trigger'> & {
  /**
   * The trigger to load the script:
   * - `onNuxtReady` - Load the script when Nuxt is ready.
   * - `manual` - Load the script manually by calling `$script.load()` or `$script.waitForLoad()`.
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
   * @internal
   */
  performanceMarkFeature?: string
}

export type NuxtUseScriptOptionsSerializable = Omit<NuxtUseScriptOptions, 'use' | 'skipValidation' | 'stub' | 'trigger' | 'eventContext' | 'beforeInit'> & { trigger?: 'client' | 'server' | 'onNuxtReady' }

export type NuxtUseScriptInput = UseScriptInput

export interface TrackedPage {
  title?: string
  path: string
}

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
  postConsentTrigger?: NuxtUseScriptOptions['trigger']
}

export interface NuxtAppScript {
  key: string
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
  segment?: SegmentInput
  stripe?: StripeInput
  xPixel?: XPixelInput
  youtubePlayer?: YouTubePlayerInput
  vimeoPlayer?: VimeoPlayerInput
  [key: `${string}-npm`]: NpmInput
}

export type NuxtConfigScriptRegistryEntry<T> = true | 'mock' | T | [T, NuxtUseScriptOptionsSerializable]
export type NuxtConfigScriptRegistry<T extends keyof ScriptRegistry = keyof ScriptRegistry> = Partial<{
  [key in T]: NuxtConfigScriptRegistryEntry<ScriptRegistry[key]>
}>

const emptyOptions = object({})

export type EmptyOptionsSchema = typeof emptyOptions

export type RegistryScriptInput<T extends ObjectSchema<any, any> = EmptyOptionsSchema, Bundelable extends boolean = true, Usable extends boolean = false> = InferInput<T> & {
  /**
   * A unique key to use for the script, this can be used to load multiple of the same script with different options.
   */
  key?: string
  scriptInput?: MaybeComputedRefEntriesOnly<Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'>>
  scriptOptions?: Omit<NuxtUseScriptOptions, Bundelable extends true ? '' : 'bundle' | Usable extends true ? '' : 'use'>
}

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
