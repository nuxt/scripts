/// <reference types="youtube" />
import { watch } from 'vue'
import { useRegistryScript } from '../utils'
import { object } from '#nuxt-scripts-validator'
import { useHead } from '#imports'
import type { RegistryScriptInput } from '#nuxt-scripts'

export interface YouTubeIframeApi {
  // YT is a class -> new YT -> new YT.Player
  YT: typeof YT
}

declare global {
  interface Window extends YouTubeIframeApi {
    onYouTubeIframeAPIReady: () => void
  }
}

export const YouTubeIframeOptions = object({
  // no options afaik
})

export type YouTubeIFrameInput = RegistryScriptInput<typeof YouTubeIframeOptions>

export function useScriptYouTubeIframe<T extends YouTubeIframeApi>(_options: YouTubeIFrameInput) {
  let readyPromise: Promise<void> = Promise.resolve()
  const instance = useRegistryScript<T, typeof YouTubeIframeOptions>('youtubeIframe', () => ({
    scriptInput: {
      src: 'https://www.youtube.com/iframe_api',
      // @ts-expect-error TODO fix types upstream
      crossorigin: false, // crossorigin can't be set or it breaks
    },
    schema: import.meta.dev ? YouTubeIframeOptions : undefined,
    scriptOptions: {
      use() {
        return {
          YT: readyPromise.then(() => {
            return window.YT
          }),
        }
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            readyPromise = new Promise((resolve) => {
              window.onYouTubeIframeAPIReady = resolve
            })
          },
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
