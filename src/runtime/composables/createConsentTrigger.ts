import type { ConsentPromiseOptions } from '../types'
import { isDoNotTrackEnabled, isRef, onNuxtReady, ref, toValue, watch } from '#imports'

export function createConsentTrigger(options: ConsentPromiseOptions) {
  return new Promise<void>((resolve) => {
    onNuxtReady(() => {
      const consented = ref<boolean>(false)
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
      watch(consented, (ready) => {
        if (ready)
          resolve()
      })
    })
  })
}
