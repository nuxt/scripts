import type { PostHog, PostHogConfig } from 'posthog-js'
import { any, record, string, object, optional, boolean, union, literal } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { logger } from '../logger'

export const PostHogOptions = object({
  apiKey: string(),
  region: optional(union([literal('us'), literal('eu')])),
  autocapture: optional(boolean()),
  capturePageview: optional(boolean()),
  capturePageleave: optional(boolean()),
  disableSessionRecording: optional(boolean()),
  config: optional(record(string(), any())),
})

export type PostHogInput = RegistryScriptInput<typeof PostHogOptions, false, true>

export interface PostHogApi {
  posthog: PostHog
}

declare global {
  interface Window {
    posthog?: PostHog
    __posthogInitPromise?: Promise<PostHog | undefined>
    _posthogQueue?: { prop: string | symbol, args: any[] }[]
  }
}

export function useScriptPostHog<T extends PostHogApi>(_options?: PostHogInput) {
  return useRegistryScript<T, typeof PostHogOptions>('posthog', (options) => {
    return {
      scriptMode: 'npm', // Use NPM mode - no external script tag
      schema: import.meta.dev ? PostHogOptions : undefined,
      scriptOptions: {
        use() {
          if (window.posthog)
            return { posthog: window.posthog }

          const posthog = new Proxy({}, {
            get(_, prop) {
              if (window.posthog)
                return (window.posthog as any)[prop]

              if (prop === 'then')
                return undefined

              return (...args: any[]) => {
                if (window.posthog)
                  return (window.posthog as any)[prop](...args)
                window._posthogQueue = window._posthogQueue || []
                window._posthogQueue.push({ prop, args })
              }
            },
          })
          return { posthog } as unknown as PostHogApi
        },
      },
      clientInit: import.meta.server
        ? undefined
        : async () => {
          // Use window for state to handle HMR correctly
          if (window.__posthogInitPromise || window.posthog)
            return

          if (!options?.apiKey) {
            logger.warn('PostHog apiKey is required')
            return
          }

          const region = options?.region || 'us'
          const apiHost = region === 'eu'
            ? 'https://eu.i.posthog.com'
            : 'https://us.i.posthog.com'

          // eslint-disable-next-line no-console
          console.log('[PostHog] Starting dynamic import of posthog-js...')

          window.__posthogInitPromise = import('posthog-js')
            .then(({ default: posthog }) => {
              // eslint-disable-next-line no-console
              console.log('[PostHog] posthog-js imported successfully')
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

              // eslint-disable-next-line no-console
              console.log('[PostHog] Calling posthog.init with apiKey:', options.apiKey, 'config:', config)
              const instance = posthog.init(options.apiKey, config)
              if (!instance) {
                logger.error('PostHog init returned undefined - initialization failed')
                // Clear queue on init failure to prevent memory leak
                delete window._posthogQueue
                return undefined
              }

              // eslint-disable-next-line no-console
              console.log('[PostHog] posthog.init succeeded, instance:', instance)
              window.posthog = instance
              // Flush queued calls now that PostHog is ready
              if (window._posthogQueue && window._posthogQueue.length > 0) {
                // eslint-disable-next-line no-console
                console.log('[PostHog] Flushing', window._posthogQueue.length, 'queued calls')
                window._posthogQueue.forEach(q => (window.posthog as any)[q.prop]?.(...q.args))
                delete window._posthogQueue
              }
              // eslint-disable-next-line no-console
              console.log('[PostHog] Initialization complete!')
              return window.posthog
            })
            .catch((e) => {
              logger.error('Failed to load posthog-js:', e)

              console.error('[PostHog] Import/init error:', e)
              // Clear queue on error to prevent memory leak
              delete window._posthogQueue
              return undefined
            })

          // Return the promise so NPM stub knows when initialization completes
          return window.__posthogInitPromise
        },
    }
  }, _options)
}
