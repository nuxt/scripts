import type {
  MaybeComputedElementRef,
  MaybeElement,
  UseIntersectionObserverReturn,
} from '@vueuse/core'
import {
  useEventListener,
  useIntersectionObserver,
} from '@vueuse/core'
import { tryOnScopeDispose } from '@vueuse/shared'
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
  return new Promise<void>((resolve, reject) => {
    observer = useIntersectionObserver(
      element,
      (intersectionObserverEntries) => {
        // Get the latest value of isIntersecting based on the entry time
        for (const entry of intersectionObserverEntries) {
          if (entry.isIntersecting)
            resolve()
        }
      },
      {
        rootMargin: '30px 0px 0px 0px',
        threshold: 0,
      },
    )
    tryOnScopeDispose(reject)
  })
    .catch(() => {
      // it's okay
    })
    .finally(() => {
      observer.stop()
    })
}

/**
 * Create a trigger for an element to load a script based on specific element events.
 */
export function useScriptTriggerElement(options: ElementScriptTriggerOptions): Promise<void> | 'onNuxtReady' {
  const { el, trigger } = options
  const triggers = (Array.isArray(options.trigger) ? options.trigger : [options.trigger]).filter(Boolean) as string[]
  if (!trigger || triggers.includes('immediate') || triggers.includes('onNuxtReady')) {
    return 'onNuxtReady'
  }
  if (import.meta.server || !el)
    return new Promise<void>(() => {})
  if (triggers.some(t => ['visibility', 'visible'].includes(t)))
    return useElementVisibilityPromise(el)
    // TODO optimize this, only have 1 instance of intersection observer, stop on find
  return new Promise<void>((resolve, reject) => {
    const _ = useEventListener(
      typeof el !== 'undefined' ? (el as EventTarget) : document.body,
      triggers,
      () => {
        _()
        resolve()
      },
      { once: true, passive: true },
    )
    tryOnScopeDispose(reject)
  }).catch(() => {
    // it's okay
  })
}
