import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { NuxtUseScriptOptions } from '../../../nuxt-script/src/runtime/composables/useScript'

export type MaybeComputedRef<T> = T | ComputedRef<T> | MaybeRefOrGetter<T>

export type MaybeComputedRefEntries<T> = {
  [key in keyof T]?: MaybeComputedRef<T[key]>
}

export type ThirdPartyScriptOptions<O, T> = Partial<MaybeComputedRefEntries<O>> & Omit<NuxtUseScriptOptions<T>, 'use'>
