import type { UseScriptOptions } from '@unhead/schema'
import type { UseScriptInput } from '@unhead/vue'
import type { Ref } from 'vue'

export type NuxtUseScriptOptions<T = any> = UseScriptOptions<T>

export type NuxtUseScriptInput = UseScriptInput

export interface TrackedPage {
  title?: string
  path: string
}

export type NuxtUseTrackingScriptOptions<T = any> = Omit<NuxtUseScriptOptions<T>, 'trigger'> & {
  consent: Promise<boolean | void> | Ref<boolean> | boolean
  ignoreDoNotTrack?: boolean
}
