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
    onNuxtReady(() => {
      if (!target) {
        resolve(false)
        return
      }

      const cleanupFns: Array<() => void> = []

      // Listen for all specified events
      events.forEach((event) => {
        const cleanup = useEventListener(
          target,
          event,
          () => {
            // Clean up all listeners when any event triggers
            cleanupFns.forEach(fn => fn())
            resolve(true)
          },
          { once: true, passive: true },
        )
        cleanupFns.push(cleanup)
      })

      tryOnScopeDispose(() => {
        cleanupFns.forEach(fn => fn())
        resolve(false)
      })
    })
  })
}
