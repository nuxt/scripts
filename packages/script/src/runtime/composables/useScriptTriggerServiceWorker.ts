import { tryOnScopeDispose } from '@vueuse/shared'

/**
 * Create a trigger that loads a script after the service worker is controlling the page.
 * Falls back to immediate loading if service workers are not supported or after timeout.
 */
export function useScriptTriggerServiceWorker(options?: { timeout?: number }): Promise<boolean> {
  if (import.meta.server)
    return new Promise(() => {})

  const timeout = options?.timeout ?? 3000

  return new Promise<boolean>((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve(true)
      return
    }

    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    }
    const done = (value: boolean) => {
      if (settled)
        return
      settled = true
      cleanup()
      resolve(value)
    }

    function onControllerChange() {
      done(true)
    }

    tryOnScopeDispose(() => done(false))

    // If SW is already controlling, we're good
    if (navigator.serviceWorker.controller) {
      done(true)
      return
    }

    // Wait for SW to take control of this page
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // Fallback timeout in case SW never takes control
    timer = setTimeout(() => {
      console.warn('[nuxt-scripts] Service worker not controlling after timeout, loading scripts anyway')
      done(true)
    }, timeout)
  })
}
