import { useEventListener } from '@vueuse/core'
import { tryOnScopeDispose } from '@vueuse/shared'
import { onNuxtReady } from 'nuxt/app'

export interface InteractionScriptTriggerOptions {
  /**
   * The interaction events to listen for.
   */
  events: string[]
  /**
   * The element to listen for events on.
   * @default document.documentElement
   */
  target?: EventTarget | null
}

/**
 * Create a trigger that loads a script when any of the specified interaction events occur.
 */
export function useScriptTriggerInteraction(options: InteractionScriptTriggerOptions): Promise<boolean> {
  if (import.meta.server) {
    return new Promise(() => {})
  }

  const { events, target = document.documentElement } = options

  return new Promise<boolean>((resolve) => {
    let disposed = false
    let settled = false
    const cleanupFns: Array<() => void> = []

    const cleanup = () => {
      cleanupFns.splice(0).forEach(fn => fn())
    }
    const settle = (value: boolean) => {
      if (settled)
        return
      settled = true
      cleanup()
      resolve(value)
    }

    // onNuxtReady can run after the component scope has already been stopped,
    // so disposal must be registered synchronously during setup.
    tryOnScopeDispose(() => {
      disposed = true
      settle(false)
    })

    onNuxtReady(() => {
      if (disposed)
        return
      if (!target) {
        settle(false)
        return
      }

      // Listen for all specified events
      events.forEach((event) => {
        const cleanup = useEventListener(
          target,
          event,
          () => {
            settle(true)
          },
          { once: true, passive: true },
        )
        cleanupFns.push(cleanup)
      })
    })
  })
}
