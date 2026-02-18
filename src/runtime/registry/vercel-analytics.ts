import { useRegistryScript } from '../utils'
import { boolean, literal, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export type AllowedPropertyValues = string | number | boolean | null | undefined

export type VercelAnalyticsMode = 'auto' | 'development' | 'production'

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
})

export type VercelAnalyticsInput = RegistryScriptInput<typeof VercelAnalyticsOptions, false, false, false>

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

export function useScriptVercelAnalytics<T extends VercelAnalyticsApi>(_options?: VercelAnalyticsInput) {
  return useRegistryScript<T, typeof VercelAnalyticsOptions>('vercelAnalytics', (options) => {
    const scriptInput: { 'src': string, 'defer': boolean, 'data-dsn'?: string, 'data-disable-auto-track'?: string, 'data-debug'?: string } = {
      src: 'https://va.vercel-scripts.com/v1/script.js',
      defer: true,
    }

    if (options?.dsn)
      scriptInput['data-dsn'] = options.dsn
    if (options?.disableAutoTrack)
      scriptInput['data-disable-auto-track'] = '1'
    if (options?.debug !== undefined)
      scriptInput['data-debug'] = String(options.debug)

    return {
      scriptInput,
      schema: import.meta.dev ? VercelAnalyticsOptions : undefined,
      scriptOptions: {
        // Load on client hydration for accurate web vitals
        trigger: 'client',
        use: () => ({
          va: (...args: [string, unknown?]) => window.va?.(...args),
          track(name: string, properties?: Record<string, AllowedPropertyValues>) {
            window.va?.('event', properties ? { name, data: properties } : { name })
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
              ; (window.vaq = window.vaq || []).push(params)
            }
            if (options?.mode && options.mode !== 'auto') {
              window.vam = options.mode
            }
          },
    }
  }, _options)
}
