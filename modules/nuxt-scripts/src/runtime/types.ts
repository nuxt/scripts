import type { ComputedRef, Ref } from 'vue'
import type { VueScriptInstance } from '@unhead/vue'
import type { NuxtUseScriptOptions } from './composables/useScript'

export type MaybeComputedRef<T> = T | (() => T) | ComputedRef<T> | Ref<T>

export type MaybeComputedRefEntries<T> = {
  [key in keyof T]?: MaybeComputedRef<T[key]>
}

export type ThirdPartyScriptOptions<O, T> = Partial<MaybeComputedRefEntries<O>> & Omit<NuxtUseScriptOptions<T>, 'use'>

export type ThirdPartyScriptApi<T> = T & { $script: VueScriptInstance<T> }
