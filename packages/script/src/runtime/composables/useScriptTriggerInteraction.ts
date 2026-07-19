import type { UseScriptTrigger } from '@unhead/vue/scripts'
import { createScriptTriggerInteraction } from 'unhead/scripts/triggers'
import { createNuxtReadyScriptTrigger } from '../utils/nuxt-ready-script-trigger'

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
export function useScriptTriggerInteraction(options: InteractionScriptTriggerOptions): UseScriptTrigger {
  if (!options.events.length)
    throw new Error('[nuxt-scripts] Interaction script triggers require at least one event.')

  const target = options.target === undefined
    ? () => typeof document === 'undefined' ? null : document.documentElement
    : () => {
        if (!options.target && import.meta.dev)
          console.warn('[nuxt-scripts] Interaction script trigger has no event target; the script will remain unloaded.')
        return options.target || null
      }
  return createNuxtReadyScriptTrigger(createScriptTriggerInteraction({
    events: options.events,
    target,
  }))
}
