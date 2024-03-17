import type { UseScriptOptions } from '@unhead/schema'
import type { UseScriptInput } from '@unhead/vue'
import type { Ref } from 'vue'

export type NuxtUseScriptOptions<T = any> = UseScriptOptions<T> & {
  assetStrategy?: 'bundle'
}

export type NuxtUseScriptInput = UseScriptInput

export interface TrackedPage {
  title?: string
  path: string
}

export interface ConsentPromiseOptions {
  consent: Promise<boolean | void> | Ref<boolean> | boolean
  honourDoNotTrack?: boolean
}
