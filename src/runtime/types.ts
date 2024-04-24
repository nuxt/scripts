import type { UseScriptOptions } from '@unhead/schema'
import type { UseScriptInput, VueScriptInstance } from '@unhead/vue'
import type { ComputedRef, Ref } from 'vue'
import type { Input, ObjectSchema } from 'valibot'
import type { Import } from 'unimport'
import type { SegmentInput } from './registry/segment'
import type { CloudflareWebAnalyticsInput } from './registry/cloudflare-web-analytics'
import type { FacebookPixelInput } from './registry/facebook-pixel'
import type { FathomAnalyticsInput } from './registry/fathom-analytics'
import type { HotjarInput } from './registry/hotjar'
import type { IntercomInput } from './registry/intercom'
import type { ConfettiInput } from './registry/confetti'
import type { GoogleAnalyticsInput } from '~/src/runtime/registry/google-analytics'
import type { GoogleMapsInput } from '~/src/runtime/registry/google-maps'
import type { GoogleTagManagerInput } from '~/src/runtime/registry/google-tag-manager'
import type { MatomoAnalyticsInput } from '~/src/runtime/registry/matomo-analytics'
import type { StripeInput } from '~/src/runtime/registry/stripe'
import type { VimeoInput } from '~/src/runtime/registry/vimeo'
import type { XPixelInput } from '~/src/runtime/registry/x-pixel'

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
   * - `bundle` - Bundle the script as an asset.
   * - `null` - Do not bundle the script.
   */
  assetStrategy?: null | 'bundle'
}

export type NuxtUseScriptIntegrationOptions = Omit<NuxtUseScriptOptions, 'use'>

export type NuxtUseScriptInput = UseScriptInput

export interface TrackedPage {
  title?: string
  path: string
}

export interface ConsentPromiseOptions {
  /**
   * An optional reactive (or promise) reference to the consent state. You can use this to accept the consent for scripts
   * instead of using the accept() method.
   */
  consent?: Promise<boolean | void> | Ref<boolean> | ComputedRef<boolean> | boolean
  /**
   * Should the script be loaded on the `requestIdleCallback` callback. This is useful for non-essential scripts that
   * have already been consented to be loaded.
   */
  loadOnNuxtReady?: boolean
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

export type ScriptRegistryEntry<T> = true | T | [T, NuxtUseScriptOptions<T>]

export interface ScriptRegistry {
  cloudflareWebAnalytics?: ScriptRegistryEntry<CloudflareWebAnalyticsInput>
  confetti?: ScriptRegistryEntry<ConfettiInput>
  facebookPixel?: ScriptRegistryEntry<FacebookPixelInput>
  fathomAnalytics?: ScriptRegistryEntry<FathomAnalyticsInput>
  googleAnalytics?: ScriptRegistryEntry<GoogleAnalyticsInput>
  googleMaps?: ScriptRegistryEntry<GoogleMapsInput>
  googleTagManager?: ScriptRegistryEntry<GoogleTagManagerInput>
  hotjar?: ScriptRegistryEntry<HotjarInput>
  intercom?: ScriptRegistryEntry<IntercomInput>
  matomoAnalytics?: ScriptRegistryEntry<MatomoAnalyticsInput>
  segment?: ScriptRegistryEntry<SegmentInput>
  stripe?: ScriptRegistryEntry<StripeInput>
  vimeo?: ScriptRegistryEntry<VimeoInput>
  xPixel?: ScriptRegistryEntry<XPixelInput>
}

export type RegistryScriptInput<T extends ObjectSchema<any>, Bundelable extends boolean = true> = Input<T> & {
  scriptInput?: UseScriptInput
  scriptOptions?: Bundelable extends true ? Omit<NuxtUseScriptOptions, 'use'> : Omit<NuxtUseScriptOptions, 'assetStrategy' | 'use'>
}

export type RegistryScripts = {
  import: Import
  scriptBundling?: false | ((options?: any) => string)
  label?: string
  src?: string | false
  category?: string
  logo?: string | { light: string, dark: string }
}[]
