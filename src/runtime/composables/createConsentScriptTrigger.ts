import type { ConsentPromiseOptions } from '../types'
import { isRef, onNuxtReady, ref, requestIdleCallback, toValue, tryUseNuxtApp, watch } from '#imports'

type CreateConsentScriptTriggerApi = { accept: () => void } & Promise<void>

export function createConsentScriptTrigger(options?: ConsentPromiseOptions): CreateConsentScriptTriggerApi {
  if (import.meta.server)
    return new Promise(() => {}) as CreateConsentScriptTriggerApi

  const consented = ref<boolean>(false)
  // user may want ot still load the script on idle
  const nuxtApp = tryUseNuxtApp()
  const promise = new Promise<void>((resolve) => {
    watch(consented, (ready) => {
      if (ready) {
        const runner = nuxtApp?.runWithContext || ((cb: () => void) => cb())
        if (options?.postConsentTrigger instanceof Promise) {
          options.postConsentTrigger.then(() => runner(resolve))
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
      // check for boolean primitive
      if (typeof options?.consent === 'boolean') {
        consented.value = true
      }
      // consent is a promise
      else if (options?.consent instanceof Promise) {
        options?.consent.then((res) => {
          consented.value = typeof res === 'boolean' ? res : true
        })
      }
      else if (isRef(options?.consent)) {
        watch(options.consent, (_val) => {
          const val = toValue(_val)
          if (typeof val === 'boolean')
            consented.value = val
        }, { immediate: true })
      }
    }
  }) as CreateConsentScriptTriggerApi
  // we augment the promise with a consent API
  promise.accept = () => {
    consented.value = true
  }
  return promise as CreateConsentScriptTriggerApi
}
