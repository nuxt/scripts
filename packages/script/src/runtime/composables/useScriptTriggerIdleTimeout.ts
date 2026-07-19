import type { UseScriptTrigger } from '@unhead/vue/scripts'
import { createScriptTriggerTimeout } from 'unhead/scripts/triggers'
import { createNuxtReadyScriptTrigger } from '../utils/nuxt-ready-script-trigger'

export interface IdleTimeoutScriptTriggerOptions {
  /**
   * The timeout in milliseconds to wait before loading the script.
   */
  timeout: number
}

/**
 * Create a trigger that loads a script after an idle timeout once Nuxt is ready.
 */
export function useScriptTriggerIdleTimeout(options: IdleTimeoutScriptTriggerOptions): UseScriptTrigger {
  return createNuxtReadyScriptTrigger(createScriptTriggerTimeout(options))
}
