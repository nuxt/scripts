import type {
  MaybeComputedElementRef,
  MaybeElement,
  UseIntersectionObserverReturn,
} from '@vueuse/core'
import {
  useEventListener,
  useIntersectionObserver,
} from '@vueuse/core'
import { tryOnScopeDispose, tryOnMounted } from '@vueuse/shared'
import { watch } from 'vue'
import type { ElementScriptTrigger } from '../types'

export interface ElementScriptTriggerOptions {
  /**
   * The event to trigger the script load.
   */
  trigger?: ElementScriptTrigger | undefined
  /**
   * The element to watch for the trigger event.
   * @default document.body
   */
  el?: MaybeComputedElementRef<MaybeElement>
}

function useElementVisibilityPromise(element: MaybeComputedElementRef) {
  let observer: UseIntersectionObserverReturn
  return new Promise<boolean>((resolve) => {
    observer = useIntersectionObserver(
      element,
      (intersectionObserverEntries) => {
        // Get the latest value of isIntersecting based on the entry time
        for (const entry of intersectionObserverEntries) {
          if (entry.isIntersecting)
            resolve(true)
        }
      },
      {
        rootMargin: '30px 0px 0px 0px',
        threshold: 0,
      },
    )
    tryOnScopeDispose(() => resolve(false))
  })
    .finally(() => {
      observer.stop()
    })
}

/**
 * Create a trigger for an element to load a script based on specific element events.
 */
export function useScriptTriggerElement(options: ElementScriptTriggerOptions): Promise<boolean> & { ssrAttrs?: Record<string, string> } | 'onNuxtReady' {
  const { el, trigger } = options
  const triggers = (Array.isArray(options.trigger) ? options.trigger : [options.trigger]).filter(Boolean) as string[]
  if (!trigger || triggers.includes('immediate') || triggers.includes('onNuxtReady')) {
    return 'onNuxtReady'
  }
  if (triggers.some(t => ['visibility', 'visible'].includes(t))) {
    if (import.meta.server || !el) {
      return new Promise(() => {})
    }
    // TODO optimize this, only have 1 instance of intersection observer, stop on find
    return useElementVisibilityPromise(el)
  }
  const ssrAttrs: Record<string, string> = {}
  if (import.meta.server) {
    triggers.forEach((trigger) => {
      ssrAttrs[`on${trigger}`] = `this.dataset.script_${trigger} = true`
    })
  }
  const p = new Promise<boolean>((resolve) => {
    const target = typeof el !== 'undefined' ? (el as EventTarget) : document.body
    const _ = useEventListener(
      target,
      triggers,
      () => {
        _()
        resolve(true)
      },
      { once: true, passive: true },
    )
    tryOnMounted(() => {
      // check if target has any of the triggers active on the data set
      watch(target, ($el) => {
        if ($el) {
          triggers.forEach((trigger) => {
            if (($el as HTMLElement).dataset[`script_${trigger}`]) {
              _()
              resolve(true)
            }
          })
        }
      }, {
        immediate: true,
      })
    })
    tryOnScopeDispose(() => resolve(false))
  })

  return Object.assign(p, { ssrAttrs })
}
