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

    let resolved = false
    const done = () => {
      if (resolved)
        return
      resolved = true
      resolve(true)
    }

    // If SW is already controlling, we're good
    if (navigator.serviceWorker.controller) {
      done()
      return
    }

    // Wait for SW to take control of this page
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      done()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // Fallback timeout in case SW never takes control
    const timer = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      console.warn('[nuxt-scripts] Service worker not controlling after timeout, loading scripts anyway')
      done()
    }, timeout)

    tryOnScopeDispose(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      clearTimeout(timer)
      resolve(false)
    })
  })
}
