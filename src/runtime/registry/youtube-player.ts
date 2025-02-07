/// <reference types="youtube" />
import { watch } from 'vue'
import type { UseScriptContext } from '@unhead/vue'
import { useHead } from '@unhead/vue'
import type { MaybePromise } from '../utils'
import { useRegistryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export interface YouTubePlayerApi {
  YT: MaybePromise<{
    Player: YT.Player
    PlayerState: YT.PlayerState
    get(k: string): any
    loaded: 0 | 1
    loading: 0 | 1
    ready(f: () => void): void
    scan(): void
    setConfig(config: YT.PlayerOptions): void
    subscribe<EventName extends keyof YT.Events>(
      event: EventName,
      listener: YT.Events[EventName],
      context?: any
    ): void
    unsubscribe<EventName extends keyof YT.Events>(
      event: EventName,
      listener: YT.Events[EventName],
      context?: any
    ): void
  }>
}

declare global {
  interface Window extends YouTubePlayerApi {
    onYouTubeIframeAPIReady: () => void
  }
}

export type YouTubePlayerInput = RegistryScriptInput

export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options: YouTubePlayerInput): UseScriptContext<T> {
  let readyPromise: Promise<void> = Promise.resolve()
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
          readyPromise = new Promise((resolve) => {
            window.onYouTubeIframeAPIReady = resolve
          })
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
