import { createAbortablePromise } from './abortable-promise'

interface YouTubeReadinessState {
  controller?: AbortController
  promise: Promise<void>
}

const readinessByWindow = new WeakMap<Window, YouTubeReadinessState>()

export function useYouTubeReadinessState(): YouTubeReadinessState {
  const existing = readinessByWindow.get(window)
  if (existing)
    return existing
  const state = { promise: Promise.resolve() }
  readinessByWindow.set(window, state)
  return state
}

export function armYouTubeReadiness(state: YouTubeReadinessState) {
  state.controller?.abort()
  const controller = new AbortController()
  const target = window
  state.controller = controller
  state.promise = createAbortablePromise((resolve) => {
    const previousReady = target.onYouTubeIframeAPIReady
    let onReady: () => void
    const restoreReady = () => {
      if (target.onYouTubeIframeAPIReady !== onReady)
        return
      if (previousReady)
        target.onYouTubeIframeAPIReady = previousReady
      else
        delete (target as any).onYouTubeIframeAPIReady
    }
    onReady = () => {
      restoreReady()
      try {
        previousReady?.call(target)
      }
      catch (error) {
        if (import.meta.dev)
          console.error('[nuxt-scripts] Previous onYouTubeIframeAPIReady handler failed:', error)
      }
      finally {
        resolve()
      }
    }
    target.onYouTubeIframeAPIReady = onReady
    return restoreReady
  }, {
    signal: controller.signal,
    abortMessage: 'YouTube API readiness wait was aborted',
  })
  // Removal can reject readiness before any caller has requested YT.
  // Mark the internal promise handled while preserving rejection for consumers.
  void state.promise.then(undefined, () => undefined)
}
