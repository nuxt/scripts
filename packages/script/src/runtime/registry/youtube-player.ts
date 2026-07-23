import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useHead } from '@unhead/vue'
/// <reference types="youtube" />
import { watch } from 'vue'
import { useRegistryScript } from '../utils'

export interface YouTubePlayerApi {
  YT: {
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
  }
}

declare global {
  interface Window extends YouTubePlayerApi {
    onYouTubeIframeAPIReady?: () => void
  }
}

export type YouTubePlayerInput = RegistryScriptInput

export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options: YouTubePlayerInput): UseScriptContext<T> {
  const instance = useRegistryScript<T>('youtubePlayer', () => ({
    scriptInput: {
      src: 'https://www.youtube.com/iframe_api',
      crossorigin: false, // crossorigin can't be set or it breaks
    },
    scriptOptions: {
      resolve({ waitFor }) {
        if (typeof window.YT?.Player === 'function')
          return { YT: window.YT } as unknown as T

        return waitFor<T>((resolve, reject) => {
          const previousReady = window.onYouTubeIframeAPIReady
          let onReady: () => void
          const restoreReady = () => {
            if (window.onYouTubeIframeAPIReady !== onReady)
              return
            if (previousReady)
              window.onYouTubeIframeAPIReady = previousReady
            else
              delete window.onYouTubeIframeAPIReady
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
            if (typeof window.YT?.Player === 'function')
              resolve({ YT: window.YT } as unknown as T)
            else
              reject(new Error('[nuxt-scripts] YouTube reported ready without exposing window.YT.Player'))
          }
          window.onYouTubeIframeAPIReady = onReady
          return restoreReady
        })
      },
    },
  }), _options)
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
