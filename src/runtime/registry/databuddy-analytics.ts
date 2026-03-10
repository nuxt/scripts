import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { DatabuddyAnalyticsOptions } from './schemas'

export { DatabuddyAnalyticsOptions }

export type DatabuddyAnalyticsInput = RegistryScriptInput<typeof DatabuddyAnalyticsOptions, false>

export interface DatabuddyAnalyticsApi {
  /**
   * Track a custom event.
   * @param eventName Name of the event (use snake_case)
   * @param properties Optional event properties
   */
  track: (eventName: string, properties?: Record<string, any>) => Promise<any> | any | void

  /**
   * Manually record a page / screen view. Useful for SPA route changes.
   * @param path Optional path to record (defaults to current location)
   * @param properties Optional additional properties for the screen view
   */
  screenView: (path?: string, properties?: Record<string, any>) => void

  /**
   * Set properties that will be attached to all future events (e.g. user_id).
   * @param properties Key/value map of properties to attach globally
   */
  setGlobalProperties: (properties: Record<string, any>) => void

  /**
   * Track a custom event alias (compatibility helper present on the global)
   * @param eventName Name of the event
   * @param properties Optional event properties
   */
  trackCustomEvent: (eventName: string, properties?: Record<string, any>) => void

  /**
   * Clears session and anonymous identifiers (useful on logout).
   */
  clear: () => void

  /**
   * Force immediate sending of any queued/batched events.
   */
  flush: () => void
}

declare global {
  interface Window {
    databuddy?: DatabuddyAnalyticsApi
    db?: DatabuddyAnalyticsApi
  }
}

export function useScriptDatabuddyAnalytics<T extends DatabuddyAnalyticsApi>(_options?: DatabuddyAnalyticsInput) {
  return useRegistryScript<T, typeof DatabuddyAnalyticsOptions>('databuddyAnalytics', (options) => {
    return {
      scriptInput: {
        // Default CDN script, can be overridden via scriptUrl
        'src': options?.scriptUrl || 'https://cdn.databuddy.cc/databuddy.js',
        'data-client-id': options.clientId,
        // Advanced
        'data-api-url': options?.apiUrl,
        'data-disabled': options?.disabled,
        // Core
        'data-track-screen-views': options?.trackScreenViews,
        'data-track-performance': options?.trackPerformance,
        'data-track-sessions': options?.trackSessions,
        // Optional
        'data-track-web-vitals': options?.trackWebVitals,
        'data-track-errors': options?.trackErrors,
        'data-track-outgoing-links': options?.trackOutgoingLinks,
        'data-track-scroll-depth': options?.trackScrollDepth,
        'data-track-engagement': options?.trackEngagement,
        'data-track-interactions': options?.trackInteractions,
        'data-track-attributes': options?.trackAttributes,
        'data-track-hash-changes': options?.trackHashChanges,
        'data-track-exit-intent': options?.trackExitIntent,
        'data-track-bounce-rate': options?.trackBounceRate,
        // Performance tuning
        'data-enable-batching': options?.enableBatching,
        'data-batch-size': options?.batchSize,
        'data-batch-timeout': options?.batchTimeout,
        'data-enable-retries': options?.enableRetries,
        'data-max-retries': options?.maxRetries,
        'data-initial-retry-delay': options?.initialRetryDelay,
        'data-sampling-rate': options?.samplingRate,
        // SDK meta
        'data-sdk': options?.sdk,
        'data-sdk-version': options?.sdkVersion,
        // Observability & logging
        'data-enable-observability': options?.enableObservability,
        'data-observability-service': options?.observabilityService,
        'data-observability-environment': options?.observabilityEnvironment,
        'data-observability-version': options?.observabilityVersion,
        'data-enable-logging': options?.enableLogging,
        'data-enable-tracing': options?.enableTracing,
        'data-enable-error-tracking': options?.enableErrorTracking,
      },
      schema: import.meta.dev ? DatabuddyAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          if (typeof window === 'undefined') {
            return null as unknown as T
          }
          // Prefer the lightweight proxy (db) if available, else raw tracker instance
          return (window.db || window.databuddy || null) as unknown as T
        },
        // The SDK finds config by searching for a <script> with src containing
        // "/databuddy.js". When first-party bundling rewrites the src to
        // /_scripts/<hash>.js, the lookup fails. Set window.databuddyConfig
        // so the SDK picks up the config regardless of script src.
        clientInit: import.meta.server
          ? undefined
          : () => {
              const cfg: Record<string, unknown> = { clientId: options.clientId }
              if (options?.apiUrl)
                cfg.apiUrl = options.apiUrl
              if (options?.disabled)
                cfg.disabled = options.disabled
              if (options?.trackScreenViews)
                cfg.trackScreenViews = options.trackScreenViews
              if (options?.trackPerformance)
                cfg.trackPerformance = options.trackPerformance
              if (options?.trackSessions)
                cfg.trackSessions = options.trackSessions
              ;(window as any).databuddyConfig = cfg
            },
      },
    }
  }, _options)
}
