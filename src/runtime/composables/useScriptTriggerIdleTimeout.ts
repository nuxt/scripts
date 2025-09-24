import { tryOnScopeDispose } from '@vueuse/shared'
import { useTimeoutFn } from '@vueuse/core'
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
    onNuxtReady(() => {
      const { start, stop } = useTimeoutFn(() => {
        resolve(true)
      }, timeout, { immediate: false })

      start()

      tryOnScopeDispose(() => {
        stop()
        resolve(false)
      })
    })
  })
}
