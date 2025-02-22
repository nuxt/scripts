import { isRef, ref, toValue, watch } from 'vue'
import { tryUseNuxtApp, onNuxtReady, requestIdleCallback } from 'nuxt/app'
import type { ConsentScriptTriggerOptions } from '../types'

interface UseConsentScriptTriggerApi extends Promise<void> {
  /**
   * A function that can be called to accept the consent and load the script.
   */
  accept: () => void
}

/**
 * Load a script once consent has been provided either through a resolvable `consent` or calling the `accept` method.
 * @param options
 */
export function useScriptTriggerConsent(options?: ConsentScriptTriggerOptions): UseConsentScriptTriggerApi {
  if (import.meta.server)
    return new Promise(() => {}) as UseConsentScriptTriggerApi

  const consented = ref<boolean>(false)
  // user may want ot still load the script on idle
  const nuxtApp = tryUseNuxtApp()
  const promise = new Promise<void>((resolve) => {
    watch(consented, (ready) => {
      if (ready) {
        const runner = nuxtApp?.runWithContext || ((cb: () => void) => cb())
        // TODO drop support in v1
        if (options?.postConsentTrigger instanceof Promise) {
          options.postConsentTrigger.then(() => runner(resolve))
          return
        }
        if (typeof options?.postConsentTrigger === 'function') {
          // check if function has an argument
          if (options?.postConsentTrigger.length === 1) {
            options.postConsentTrigger(resolve)
            return
          }
          // else it's returning a promise to await
          const val = options.postConsentTrigger()
          if (val instanceof Promise) {
            return val.then(() => runner(resolve))
          }
          return
        }
        if (options?.postConsentTrigger === 'onNuxtReady') {
          const idleTimeout = options?.postConsentTrigger ? (nuxtApp ? onNuxtReady : requestIdleCallback) : (cb: () => void) => cb()
          runner(() => idleTimeout(resolve))
          return
        }
        // other trigger not supported
        runner(resolve)
      }
    })
    if (options?.consent) {
      if (isRef(options?.consent)) {
        watch(options.consent, (_val) => {
          const val = toValue(_val)
          consented.value = Boolean(val)
        }, { immediate: true })
      }
      // check for boolean primitive
      else if (typeof options?.consent === 'boolean') {
        consented.value = options?.consent
      }
      // consent is a promise
      else if (options?.consent instanceof Promise) {
        options?.consent.then((res) => {
          consented.value = typeof res === 'boolean' ? res : true
        })
      }
    }
  }) as UseConsentScriptTriggerApi
  // we augment the promise with a consent API
  promise.accept = () => {
    consented.value = true
  }
  return promise as UseConsentScriptTriggerApi
}
