import { useTimeoutFn } from '@vueuse/core'
import { tryOnScopeDispose } from '@vueuse/shared'
import { onNuxtReady } from 'nuxt/app'

export interface IdleTimeoutScriptTriggerOptions {
  /**
   * The timeout in milliseconds to wait before loading the script.
   */
  timeout: number
}

/**
 * Create a trigger that loads a script after an idle timeout once Nuxt is ready.
 */
export function useScriptTriggerIdleTimeout(options: IdleTimeoutScriptTriggerOptions): Promise<boolean> {
  if (import.meta.server) {
    return new Promise(() => {})
  }

  const { timeout } = options

  return new Promise<boolean>((resolve) => {
    let disposed = false
    let settled = false
    let stopTimer = () => {}

    const settle = (value: boolean) => {
      if (settled)
        return
      settled = true
      stopTimer()
      resolve(value)
    }

    // Register disposal while setup's effect scope is active. onNuxtReady may
    // run later, when there is no active component scope to attach cleanup to.
    tryOnScopeDispose(() => {
      disposed = true
      settle(false)
    })

    onNuxtReady(() => {
      if (disposed)
        return

      const { start, stop } = useTimeoutFn(() => {
        settle(true)
      }, timeout, { immediate: false })

      stopTimer = stop
      start()
    })
  })
}
