import type { UseScriptOptions } from '@unhead/schema'
import type { UseScriptInput, VueScriptInstance } from '@unhead/vue'
import type { ComputedRef, Ref } from 'vue'
import type { Input, ObjectSchema } from 'valibot'
import type { CloudflareWebAnalyticsOptions } from '~/src/runtime/registry/cloudflare-web-analytics'
import type { FacebookPixelOptions } from '~/src/runtime/registry/facebook-pixel'
import type { FathomAnalyticsOptions } from '~/src/runtime/registry/fathom-analytics'
import type { HotjarOptions } from '~/src/runtime/registry/hotjar'
import type { SegmentOptions } from '~/src/runtime/registry/segment'
import type { IntercomOptions } from '~/src/runtime/registry/intercom'

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
   */
  assetStrategy?: 'bundle'
  /**
   * A hook to run when a script does not exist and will be initialized for the first time.
   */
  beforeInit?: () => void
}

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

export type ScriptRegistryEntry<T extends ObjectSchema<any>> = Input<T> | [Input<T>, NuxtUseScriptOptions<T>]

export interface ScriptRegistry {
  cloudflareWebAnalytics?: ScriptRegistryEntry<typeof CloudflareWebAnalyticsOptions>
  confetti?: ScriptRegistryEntry<typeof CloudflareWebAnalyticsOptions>
  facebookPixel?: ScriptRegistryEntry<typeof FacebookPixelOptions>
  fathomAnalytics?: ScriptRegistryEntry<typeof FathomAnalyticsOptions>
  hotjar?: ScriptRegistryEntry<typeof HotjarOptions>
  segment?: ScriptRegistryEntry<typeof SegmentOptions>
  intercom?: ScriptRegistryEntry<typeof IntercomOptions>
  // TODO augment upstream (ga, gtm, etc)
}
