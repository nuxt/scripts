import { useElementHover, useElementVisibility, watchOnce } from '@vueuse/core'
import type { Ref } from 'vue'
import { ref } from 'vue'

export type ElementScriptTrigger = 'visible' | 'mouseover' | false

export interface ElementScriptTriggerOptions {
  /**
   * The event to trigger the script load.
   */
  trigger?: ElementScriptTrigger | undefined
  /**
   * The element to watch for the trigger event.
   * @default document.body
   */
  el?: HTMLElement | Ref<HTMLElement | undefined> | null
}

/**
 * Create a trigger for an element to load a script based on specific element events.
 */
export function useElementScriptTrigger(options: ElementScriptTriggerOptions): Promise<void> {
  const { el, trigger } = options
  if (import.meta.server || !el)
    return new Promise<void>(() => {})
  const $el = typeof el !== 'undefined' ? el : document.body
  const activeRef = trigger ? (trigger === 'mouseover' ? useElementHover($el) : useElementVisibility($el)) : ref(false)
  return trigger ? new Promise<void>(resolve => watchOnce([activeRef], () => resolve())) : Promise.resolve()
}
