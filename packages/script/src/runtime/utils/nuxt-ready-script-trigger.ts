import type { UseScriptTrigger } from '@unhead/vue/scripts'
import { onNuxtReady } from 'nuxt/app'

/** Install an Unhead trigger after Nuxt has completed client startup. */
export function createNuxtReadyScriptTrigger(trigger: UseScriptTrigger): UseScriptTrigger {
  return (load) => {
    let disposed = false
    let cleanup: void | (() => void)

    onNuxtReady(() => {
      if (!disposed)
        cleanup = trigger(load) as void | (() => void)
    })

    return () => {
      disposed = true
      cleanup?.()
      cleanup = undefined
    }
  }
}
