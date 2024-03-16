import type { UseScriptInput } from '@unhead/vue'
import { useScript } from './useScript'
import type { NuxtUseTrackingScriptOptions } from '#nuxt-scripts'
import { isDoNotTrackEnabled, isRef, onNuxtReady, ref, toValue, watch } from '#imports'

export function useTrackingScript<T>(input: UseScriptInput, options?: NuxtUseTrackingScriptOptions<T>) {
  const instance = useScript(input, {
    ...options,
    trigger: 'manual',
  })
  onNuxtReady(() => {
    const consented = ref(false)
    // check if DNT is enabled, never consent
    if (!options?.ignoreDoNotTrack && isDoNotTrackEnabled())
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
      ready && instance.$script.load()
    })
  })
  return instance
}
