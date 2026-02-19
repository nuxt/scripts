import { useRegistryScript } from '../utils'
import { boolean, literal, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export type AllowedPropertyValues = string | number | boolean | null | undefined

export type VercelAnalyticsMode = 'auto' | 'development' | 'production'

export interface BeforeSendEvent {
  type: 'pageview' | 'event'
  url: string
}

export type BeforeSend = (event: BeforeSendEvent) => BeforeSendEvent | null

export const VercelAnalyticsOptions = object({
  /**
   * The DSN of the project to send events to.
   * Only required when self-hosting or deploying outside of Vercel.
   */
  dsn: optional(string()),
  /**
   * Whether to disable automatic page view tracking on route changes.
   * Set to true if you want to manually call pageview().
   */
  disableAutoTrack: optional(boolean()),
  /**
   * The mode to use for the analytics script.
   * - `auto` - Automatically detect the environment (default)
   * - `production` - Always use production script
   * - `development` - Always use development script (logs to console)
   */
  mode: optional(union([literal('auto'), literal('development'), literal('production')])),
  /**
   * Whether to enable debug logging.
   * Automatically enabled in development/test environments.
   */
  debug: optional(boolean()),
  /**
   * Custom endpoint for data collection.
   * Useful for self-hosted or proxied setups.
   */
  endpoint: optional(string()),
})

export type VercelAnalyticsInput = RegistryScriptInput<typeof VercelAnalyticsOptions, false, false, false> & {
  beforeSend?: BeforeSend
}

export interface VercelAnalyticsApi {
  va: (event: string, properties?: unknown) => void
  track: (name: string, properties?: Record<string, AllowedPropertyValues>) => void
  pageview: (options?: { route?: string | null, path?: string }) => void
}

declare global {
  interface Window {
    va?: (event: string, properties?: unknown) => void
    vaq?: [string, unknown?][]
    vam?: VercelAnalyticsMode
  }
}

function parseProperties(
  properties: Record<string, unknown>,
  options: { strip?: boolean },
): Record<string, AllowedPropertyValues> {
  let props = properties
  const errorProperties: string[] = []
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'object' && value !== null) {
      if (options.strip) {
        const { [key]: _, ...rest } = props
        props = rest
      }
      else {
        errorProperties.push(key)
      }
    }
  }
  if (errorProperties.length > 0 && !options.strip) {
    throw new Error(
      `The following properties are not valid: ${errorProperties.join(', ')}. Only strings, numbers, booleans, and null are allowed.`,
    )
  }
  return props as Record<string, AllowedPropertyValues>
}

export function useScriptVercelAnalytics<T extends VercelAnalyticsApi>(_options?: VercelAnalyticsInput) {
  const beforeSend = _options?.beforeSend
  return useRegistryScript<T, typeof VercelAnalyticsOptions>('vercelAnalytics', (options) => {
    const scriptInput: { 'src': string, 'defer': boolean, 'data-sdkn': string, 'data-dsn'?: string, 'data-disable-auto-track'?: string, 'data-debug'?: string, 'data-endpoint'?: string } = {
      'src': import.meta.dev
        ? 'https://va.vercel-scripts.com/v1/script.debug.js'
        : 'https://va.vercel-scripts.com/v1/script.js',
      'defer': true,
      'data-sdkn': '@nuxt/scripts',
    }

    if (options?.dsn)
      scriptInput['data-dsn'] = options.dsn
    if (options?.disableAutoTrack)
      scriptInput['data-disable-auto-track'] = '1'
    if (options?.endpoint)
      scriptInput['data-endpoint'] = options.endpoint
    // Only set data-debug="false" in dev mode to explicitly disable debug logging
    if (import.meta.dev && options?.debug === false)
      scriptInput['data-debug'] = 'false'

    return {
      scriptInput,
      schema: import.meta.dev ? VercelAnalyticsOptions : undefined,
      scriptOptions: {
        // Load on client hydration for accurate web vitals
        trigger: 'client',
        use: () => ({
          va: (...args: [string, unknown?]) => window.va?.(...args),
          track(name: string, properties?: Record<string, AllowedPropertyValues>) {
            if (!properties) {
              window.va?.('event', { name })
              return
            }
            try {
              const props = parseProperties(properties, { strip: !import.meta.dev })
              window.va?.('event', { name, data: props })
            }
            catch (err) {
              if (err instanceof Error && import.meta.dev)
                console.error(err)
            }
          },
          pageview(opts?: { route?: string | null, path?: string }) {
            window.va?.('pageview', opts)
          },
        }),
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            if (window.va) return
            // Set up the queue exactly as @vercel/analytics does
            window.va = function (...params: [string, unknown?]) {
              ;(window.vaq = window.vaq || []).push(params)
            }
            // Set mode — auto detects via build environment, explicit sets directly
            if (options?.mode === 'auto' || !options?.mode) {
              window.vam = import.meta.dev ? 'development' : 'production'
            }
            else {
              window.vam = options.mode
            }
            // Register beforeSend middleware
            if (beforeSend) {
              window.va('beforeSend', beforeSend)
            }
          },
    }
  }, _options)
}
