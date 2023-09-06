import type { UseScriptOptions } from '@nuxt/scripts/src/runtime/types'

export type ThirdPartyScriptOptions = Omit<UseScriptOptions<any>, 'key' | 'use' | 'script'>
