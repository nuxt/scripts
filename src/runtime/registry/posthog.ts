import type { PostHog, PostHogConfig } from 'posthog-js'
import { useRegistryScript } from '../utils'
import { string, object, optional, boolean, union, literal } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const PostHogOptions = object({
  apiKey: string(),
  region: optional(union([literal('us'), literal('eu')])),
  autocapture: optional(boolean()),
  capturePageview: optional(boolean()),
  capturePageleave: optional(boolean()),
  disableSessionRecording: optional(boolean()),
  config: optional(object({})),
})

export type PostHogInput = RegistryScriptInput<typeof PostHogOptions, false, true>

export interface PostHogApi {
  posthog: PostHog
}

declare global {
  interface Window {
    posthog?: PostHog
  }
}

let posthogInstance: PostHog | undefined
let initPromise: Promise<PostHog | undefined> | undefined

export function useScriptPostHog<T extends PostHogApi>(_options?: PostHogInput) {
  return useRegistryScript<T, typeof PostHogOptions>('posthog', options => ({
    scriptInput: {
      src: '', // No external script - using npm package
    },
    schema: import.meta.dev ? PostHogOptions : undefined,
    scriptOptions: {
      use() {
        return posthogInstance ? { posthog: posthogInstance } : undefined
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          if (initPromise)
            return

          const region = options?.region || 'us'
          const apiHost = region === 'eu'
            ? 'https://eu.i.posthog.com'
            : 'https://us.i.posthog.com'

          initPromise = import('posthog-js').then(({ default: posthog }) => {
            const config: Partial<PostHogConfig> = {
              api_host: apiHost,
              ...options?.config as Partial<PostHogConfig>,
            }
            if (typeof options?.autocapture === 'boolean')
              config.autocapture = options.autocapture
            if (typeof options?.capturePageview === 'boolean')
              config.capture_pageview = options.capturePageview
            if (typeof options?.capturePageleave === 'boolean')
              config.capture_pageleave = options.capturePageleave
            if (typeof options?.disableSessionRecording === 'boolean')
              config.disable_session_recording = options.disableSessionRecording

            posthogInstance = posthog.init(options?.apiKey || '', config)
            window.posthog = posthogInstance
            return posthogInstance
          })
        },
  }), _options)
}
