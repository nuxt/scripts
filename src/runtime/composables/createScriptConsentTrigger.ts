import type { ConsentPromiseOptions } from '../types'
import { isDoNotTrackEnabled, isRef, onNuxtReady, ref, requestIdleCallback, toValue, tryUseNuxtApp, watch } from '#imports'

export function createScriptConsentTrigger(options?: ConsentPromiseOptions): { accept: () => void } & Promise<void> {
  if (import.meta.server)
    return new Promise(() => {})

  const consented = ref<boolean>(false)
  // user may want ot still load the script on idle
  const nuxtApp = tryUseNuxtApp()
  const promise = new Promise<void>((resolve) => {
    watch(consented, (ready) => {
      if (ready) {
        const runner = nuxtApp?.runWithContext || ((cb: () => void) => cb())
        const idleTimeout = options?.idle ? (nuxtApp ? onNuxtReady : requestIdleCallback) : (cb: () => void) => cb()
        runner(() => idleTimeout(resolve))
      }
    })
    // check if DNT is enabled, never consent
    if (options?.honourDoNotTrack && isDoNotTrackEnabled())
      return
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
  })
  // we augment the promise with a consent API
  promise.accept = () => {
    consented.value = true
  }
  return promise
}
