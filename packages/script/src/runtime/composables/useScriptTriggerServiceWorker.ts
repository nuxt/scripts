import type { UseScriptTrigger } from '@unhead/vue/scripts'
import { createScriptTriggerServiceWorker } from 'unhead/scripts/triggers'

/**
 * Create a trigger that loads a script after the service worker is controlling the page.
 * Falls back to immediate loading if service workers are not supported or after timeout.
 */
export function useScriptTriggerServiceWorker(options?: { timeout?: number }): UseScriptTrigger {
  return createScriptTriggerServiceWorker({
    timeout: options?.timeout,
    onTimeout() {
      console.warn('[nuxt-scripts] Service worker not controlling after timeout, loading scripts anyway')
    },
  })
}
