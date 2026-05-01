import type { PostHog, PostHogConfig } from 'posthog-js'
import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { logger } from '../logger'
import { useRegistryScript } from '../utils'
import { PostHogOptions } from './schemas'

export { PostHogOptions }

export type PostHogInput = Omit<RegistryScriptInput<typeof PostHogOptions, false, true>, 'config'> & {
  /**
   * Additional PostHog configuration options passed directly to `posthog.init()`.
   * @see https://posthog.com/docs/libraries/js/config
   */
  config?: Partial<PostHogConfig>
}

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

export interface PostHogConsent {
  /** Call `posthog.opt_in_capturing()`. */
  optIn: () => void
  /** Call `posthog.opt_out_capturing()`. For boot-time opt-out, use `defaultConsent: 'opt-out'` instead. */
  optOut: () => void
}

export function useScriptPostHog<T extends PostHogApi>(_options?: PostHogInput): UseScriptContext<T, PostHogConsent> {
  const instance = useRegistryScript<T, typeof PostHogOptions>('posthog', (options) => {
    return {
      scriptMode: 'npm', // Use NPM mode - no external script tag
      schema: import.meta.dev ? PostHogOptions : undefined,
      scriptOptions: {
        use() {
          // SSR guard - don't access window on server
          if (import.meta.server)
            return { posthog: {} as any }

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
          let apiHost = options?.apiHost || (region === 'eu'
            ? 'https://eu.i.posthog.com'
            : 'https://us.i.posthog.com')
          // Resolve relative proxy paths to absolute URLs so SDKs using new URL() don't throw
          if (apiHost.startsWith('/'))
            apiHost = window.location.origin + apiHost

          window.__posthogInitPromise = import('posthog-js')
            .then(({ default: posthog }) => {
              const config: Partial<PostHogConfig> = {
                api_host: apiHost,
                ...options?.config as Partial<PostHogConfig>,
              }
              if (typeof options?.autocapture === 'boolean')
                config.autocapture = options.autocapture
              if (typeof options?.capturePageview === 'boolean' || options?.capturePageview === 'history_change')
                config.capture_pageview = options.capturePageview
              if (typeof options?.capturePageleave === 'boolean')
                config.capture_pageleave = options.capturePageleave
              if (typeof options?.disableSessionRecording === 'boolean')
                config.disable_session_recording = options.disableSessionRecording
              // Start opted-out if consent is denied, so init doesn't capture anything
              // until the user grants consent.
              if (options?.defaultConsent === 'opt-out')
                config.opt_out_capturing_by_default = true

              const instance = posthog.init(options.apiKey, config)
              if (!instance) {
                logger.error('PostHog init returned undefined - initialization failed')
                delete window._posthogQueue
                return undefined
              }

              window.posthog = instance
              // Apply explicit opt-in AFTER init (opt-out is handled by init config above).
              if (options?.defaultConsent === 'opt-in')
                instance.opt_in_capturing?.()
              // Flush queued calls now that PostHog is ready
              if (window._posthogQueue && window._posthogQueue.length > 0) {
                window._posthogQueue.forEach(q => (window.posthog as any)[q.prop]?.(...q.args))
                delete window._posthogQueue
              }
              return window.posthog
            })
            .catch((e) => {
              logger.error('Failed to load posthog-js:', e)
              delete window._posthogQueue
              return undefined
            })

          // Return the promise so NPM stub knows when initialization completes
          return window.__posthogInitPromise
        },
    }
  }, _options as RegistryScriptInput<typeof PostHogOptions>) as UseScriptContext<T, PostHogConsent>

  if (import.meta.client && !instance.consent) {
    instance.consent = {
      optIn: () => (instance.proxy as unknown as PostHogApi).posthog?.opt_in_capturing?.(),
      optOut: () => (instance.proxy as unknown as PostHogApi).posthog?.opt_out_capturing?.(),
    }
  }
  return instance
}
