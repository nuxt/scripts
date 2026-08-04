import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import type { MaybePromise } from '../utils'
import { useHead } from '@unhead/vue'
/// <reference types="youtube" />
import { watch } from 'vue'
import { useRegistryScript } from '../utils'
import { armYouTubeReadiness, useYouTubeReadinessState } from '../utils/youtube-readiness'

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
const readinessDecoration = Symbol('nuxt-scripts:youtube-readiness')

export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options: YouTubePlayerInput): UseScriptContext<T> {
  const instance = useRegistryScript<T>('youtubePlayer', () => ({
    scriptInput: {
      src: 'https://www.youtube.com/iframe_api',
      crossorigin: false, // crossorigin can't be set or it breaks
    },
    scriptOptions: {
      use() {
        const readiness = useYouTubeReadinessState()
        return {
          YT: window.YT || readiness.promise.then(() => {
            return window.YT
          }),
        }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          armYouTubeReadiness(useYouTubeReadinessState())
        },
  }), _options)
  const clientInstance = import.meta.server || typeof window === 'undefined'
    ? undefined
    : instance as UseScriptContext<T> & {
      [cleanupDecoration]?: boolean
      [readinessDecoration]?: ReturnType<typeof useYouTubeReadinessState>
    }
  if (clientInstance && !clientInstance[cleanupDecoration]) {
    clientInstance[cleanupDecoration] = true
    clientInstance[readinessDecoration] = useYouTubeReadinessState()
    const originalRemove = instance.remove
    instance.remove = () => {
      clientInstance[readinessDecoration]?.controller?.abort()
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
