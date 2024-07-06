import type {
  MaybeComputedElementRef,
  MaybeElement,
  UseIntersectionObserverReturn,
} from '@vueuse/core'
import {
  useEventListener,
  useIntersectionObserver,
} from '@vueuse/core'
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
  return new Promise<void>((resolve) => {
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
  }).finally(() => {
    observer.stop()
  })
}

/**
 * Create a trigger for an element to load a script based on specific element events.
 */
export function useScriptTriggerElement(options: ElementScriptTriggerOptions): Promise<void> {
  const { el, trigger } = options
  if (import.meta.server || !el)
    return new Promise<void>(() => {})
  const triggers = (Array.isArray(options.trigger) ? options.trigger : [options.trigger]).filter(Boolean) as string[]
  if (el && triggers.some(t => ['visibility', 'visible'].includes(t)))
    return useElementVisibilityPromise(el)
  if (!trigger)
    return Promise.resolve()
  if (!triggers.includes('immediate')) {
    // TODO optimize this, only have 1 instance of intersection observer, stop on find
    return new Promise<void>((resolve) => {
      const _ = useEventListener(
        typeof el !== 'undefined' ? (el as EventTarget) : document.body,
        triggers,
        () => {
          resolve()
          _()
        },
        { once: true, passive: true },
      )
    })
  }
  return Promise.resolve()
}
