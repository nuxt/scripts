import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import type { MaybePromise } from '../utils'
import { useHead } from '@unhead/vue'
/// <reference types="youtube" />
import { watch } from 'vue'
import { useRegistryScript } from '../utils'
import { createAbortablePromise } from '../utils/abortable-promise'

export interface YouTubePlayerApi {
  YT: MaybePromise<{
    Player: YT.Player
    PlayerState: YT.PlayerState
    get: (k: string) => any
    loaded: 0 | 1
    loading: 0 | 1
    ready: (f: () => void) => void
    scan: () => void
    setConfig: (config: YT.PlayerOptions) => void
    subscribe: <EventName extends keyof YT.Events>(
      event: EventName,
      listener: YT.Events[EventName],
      context?: any,
    ) => void
    unsubscribe: <EventName extends keyof YT.Events>(
      event: EventName,
      listener: YT.Events[EventName],
      context?: any,
    ) => void
  }>
}

declare global {
  interface Window extends YouTubePlayerApi {
    onYouTubeIframeAPIReady: () => void
  }
}

export type YouTubePlayerInput = RegistryScriptInput
const cleanupDecoration = Symbol('nuxt-scripts:youtube-cleanup')

export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options: YouTubePlayerInput): UseScriptContext<T> {
  let readyPromise: Promise<void> = Promise.resolve()
  let readyController: AbortController | undefined
  const instance = useRegistryScript<T>('youtubePlayer', () => ({
    scriptInput: {
      src: 'https://www.youtube.com/iframe_api',
      crossorigin: false, // crossorigin can't be set or it breaks
    },
    scriptOptions: {
      use() {
        return {
          YT: window.YT || readyPromise.then(() => {
            return window.YT
          }),
        }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          readyController?.abort()
          readyController = new AbortController()
          readyPromise = createAbortablePromise((resolve) => {
            const previousReady = window.onYouTubeIframeAPIReady
            let onReady: () => void
            const restoreReady = () => {
              if (window.onYouTubeIframeAPIReady !== onReady)
                return
              if (previousReady)
                window.onYouTubeIframeAPIReady = previousReady
              else
                delete (window as any).onYouTubeIframeAPIReady
            }
            onReady = () => {
              restoreReady()
              try {
                previousReady?.()
              }
              catch (error) {
                if (import.meta.dev)
                  console.error('[nuxt-scripts] Previous onYouTubeIframeAPIReady handler failed:', error)
              }
              finally {
                resolve()
              }
            }
            window.onYouTubeIframeAPIReady = onReady
            return restoreReady
          }, {
            signal: readyController.signal,
            abortMessage: 'YouTube API readiness wait was aborted',
          })
          // Removal can reject readiness before any caller has requested YT.
          // Mark the internal promise handled while preserving rejection for
          // consumers that do await the promise returned by `use()`.
          void readyPromise.then(undefined, () => undefined)
        },
  }), _options)
  if (import.meta.client && !(instance as any)[cleanupDecoration]) {
    ;(instance as any)[cleanupDecoration] = true
    const originalRemove = instance.remove
    instance.remove = () => {
      readyController?.abort()
      delete (instance as any)[cleanupDecoration]
      return originalRemove()
    }
  }
  // insert preconnect once we start loading the script
  if (import.meta.client) {
    const _ = watch(instance.status, (status) => {
      if (status === 'loading') {
        useHead({
          link: [
            {
              rel: 'preconnect',
              href: 'https://www.youtube-nocookie.com',
            },
            {
              rel: 'preconnect',
              href: 'https://www.google.com',
            },
            {
              rel: 'preconnect',
              href: 'https://googleads.g.doubleclick.net',
            },
            {
              rel: 'preconnect',
              href: 'https://static.doubleclick.net',
            },
          ],
        })
        _()
      }
    })
  }
  return instance
}
