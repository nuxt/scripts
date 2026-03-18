import { isRef, type Ref, ref, toValue, watch } from 'vue'
import { tryUseNuxtApp, onNuxtReady, requestIdleCallback } from 'nuxt/app'
import type { ConsentScriptTriggerOptions } from '../types'

interface UseConsentScriptTriggerApi extends Promise<void> {
  /**
   * A function that can be called to accept the consent and load the script.
   */
  accept: () => void
  /**
   * A function that can be called to revoke consent and signal the script should be unloaded.
   */
  revoke: () => void
  /**
   * Reactive reference to the consent state
   */
  consented: Ref<boolean>
}

/**
 * Load a script once consent has been provided either through a resolvable `consent` or calling the `accept` method.
 * Supports revoking consent via the reactive `consented` ref. Consumers should watch `consented` to react to revocation.
 * @param options
 */
export function useScriptTriggerConsent(options?: ConsentScriptTriggerOptions): UseConsentScriptTriggerApi {
  if (import.meta.server) {
    const p = new Promise<void>(() => {}) as UseConsentScriptTriggerApi
    p.accept = () => {}
    p.revoke = () => {}
    p.consented = ref(false)
    return p
  }

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

  const promise = new Promise<void>((resolve) => {
    watch(consented, (newValue, oldValue) => {
      if (newValue && !oldValue) {
        // Consent granted - load script
        const runner = nuxtApp?.runWithContext || ((cb: () => void) => cb())
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
      // Revocation is handled via the reactive `consented` ref, not promise rejection.
      // Once resolved, a promise cannot be rejected — consumers should watch `consented` instead.
    }, { immediate: true })
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
