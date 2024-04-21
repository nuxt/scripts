import { useElementHover, useElementVisibility, watchOnce } from '@vueuse/core'
import type { Ref } from 'vue'
import { ref } from 'vue'

export type ElementScriptTrigger = 'visible' | 'mouseover' | false

export function useElementScriptTrigger(trigger: ElementScriptTrigger | undefined, root?: HTMLElement | Ref<HTMLElement | undefined> | null) {
  if (import.meta.server || !root)
    return 'client'

  const activeRef = trigger ? (trigger === 'mouseover' ? useElementHover(root) : useElementVisibility(root)) : ref(false)
  return trigger ? new Promise<void>(resolve => watchOnce(activeRef, resolve)) : 'client'
}
