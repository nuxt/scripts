/// <reference types="youtube" />
import { registryScript } from '../utils'
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
  return registryScript<T, typeof YouTubeIframeOptions>('youtubeIframe', () => ({
    scriptInput: {
      src: 'https://www.youtube.com/iframe_api',
      // opt-out of privacy defaults
      // @ts-expect-error TODO add types
      crossorigin: null,
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
      beforeInit() {
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
      },
    },
  }), _options)
}
