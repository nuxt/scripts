/// <reference types="youtube" />
import { watch } from 'vue'
import { useRegistryScript } from '../utils'
import { useHead } from '#imports'
import type { RegistryScriptInput } from '#nuxt-scripts'

export interface YouTubePlayerApi {
  YT: typeof YT & { ready: (fn: () => void) => void }
}

declare global {
  interface Window extends YouTubePlayerApi {
    onYouTubeIframeAPIReady: () => void
  }
}

export type YouTubePlayerInput = RegistryScriptInput

export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options: YouTubePlayerInput) {
  let readyPromise: Promise<void> = Promise.resolve()
  const instance = useRegistryScript<T>(_options?.key || 'youtubePlayer', () => ({
    scriptInput: {
      src: 'https://www.youtube.com/iframe_api',
      crossorigin: false, // crossorigin can't be set or it breaks
    },
    scriptOptions: {
      use() {
        return {
          YT: readyPromise.then(() => {
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
    const _ = watch(instance.$script.status, (status) => {
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
