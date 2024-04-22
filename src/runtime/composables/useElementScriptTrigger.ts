import { useElementHover, useElementVisibility, watchOnce } from '@vueuse/core'
import type { Ref } from 'vue'
import { ref } from 'vue'

export type ElementScriptTrigger = 'visible' | 'mouseover' | false

export function useElementScriptTrigger(trigger: ElementScriptTrigger | undefined, el?: HTMLElement | Ref<HTMLElement | undefined> | null) {
  if (import.meta.server || !el)
    return new Promise<void>(() => {})

  const activeRef = trigger ? (trigger === 'mouseover' ? useElementHover(el) : useElementVisibility(el)) : ref(false)
  return trigger ? new Promise<void>(resolve => watchOnce(activeRef, resolve)) : Promise.resolve()
}
