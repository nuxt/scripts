import { isRef, type Ref, ref, toValue, watch } from 'vue'
import { tryUseNuxtApp, onNuxtReady, requestIdleCallback } from 'nuxt/app'
import type { ConsentScriptTriggerOptions } from '../types'

interface UseConsentScriptTriggerApi extends Promise<void> {
  /**
   * A function that can be called to accept the consent and load the script.
   */
  accept: () => void
  /**
   * A function that can be called to revoke the consent and unload the script.
   */
  revoke: () => void
  /**
   * Reactive reference to the consent state
   */
  consented: Ref<boolean>
}

/**
 * Load a script once consent has been provided either through a resolvable `consent` or calling the `accept` method.
 * Supports revoking consent which will unload the script by rejecting the trigger promise.
 * @param options
 */
export function useScriptTriggerConsent(options?: ConsentScriptTriggerOptions): UseConsentScriptTriggerApi {
  if (import.meta.server)
    return new Promise(() => {}) as UseConsentScriptTriggerApi

  const consented = ref<boolean>(false)
  const nuxtApp = tryUseNuxtApp()

  // Setup initial consent value
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

  const promise = new Promise<void>((resolve, reject) => {
    watch(consented, (newValue, oldValue) => {
      if (newValue && !oldValue) {
        // Consent granted - load script
        const runner = nuxtApp?.runWithContext || ((cb: () => void) => cb())
        if (typeof options?.postConsentTrigger === 'function') {
          // check if function has an argument
          if (options?.postConsentTrigger.length === 1) {
            options.postConsentTrigger(resolve)
            return
          }
          // else it's returning a promise to await
          const val = (options.postConsentTrigger as (() => Promise<any>))()
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
      else if (!newValue && oldValue) {
        // Consent revoked - trigger rejection to signal script should be unloaded
        reject(new Error('Consent revoked'))
      }
    })
  }) as UseConsentScriptTriggerApi

  // we augment the promise with a consent API
  promise.accept = () => {
    consented.value = true
  }

  promise.revoke = () => {
    consented.value = false
  }

  promise.consented = consented

  return promise as UseConsentScriptTriggerApi
}
