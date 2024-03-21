import type { UseScriptOptions } from '@unhead/schema'
import type { UseScriptInput } from '@unhead/vue'
import type { ComputedRef, Ref } from 'vue'

export type NuxtUseScriptOptions<T = any> = UseScriptOptions<T> & {
  /**
   * Should the script be bundled as an asset and loaded from your server. This is useful for improving the
   * performance by avoiding the extra DNS lookup and reducing the number of requests. It also
   * improves privacy by not sharing the user's IP address with third-party servers.
   */
  assetStrategy?: 'bundle'
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
   * The DoNotTrack property indicates that the user does not want to be tracked by the script. Most third-party scripts
   * do not honour this property, however, you can opt in for improved privacy.
   */
  honourDoNotTrack?: boolean
  /**
   * Should the script be loaded on the `requestIdleCallback` callback. This is useful for non-essential scripts that
   * have already been consented to be loaded.
   */
  idle?: boolean
}
