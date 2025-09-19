import { useRegistryScript } from '../utils'
import { object, optional, string, boolean, number } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

// Options schema based on https://www.databuddy.cc/docs/sdk
export const DatabuddyAnalyticsOptions = object({
  // Required
  clientId: string(),

  // Advanced
  scriptUrl: optional(string()), // defaults to https://cdn.databuddy.cc/databuddy.js
  apiUrl: optional(string()), // defaults to https://basket.databuddy.cc
  disabled: optional(boolean()),

  // Core tracking (enabled by default by SDK)
  trackScreenViews: optional(boolean()),
  trackPerformance: optional(boolean()),
  trackSessions: optional(boolean()),

  // Optional tracking
  trackWebVitals: optional(boolean()),
  trackErrors: optional(boolean()),
  trackOutgoingLinks: optional(boolean()),
  trackScrollDepth: optional(boolean()),
  trackEngagement: optional(boolean()),
  trackInteractions: optional(boolean()),
  trackAttributes: optional(boolean()),
  trackHashChanges: optional(boolean()),
  trackExitIntent: optional(boolean()),
  trackBounceRate: optional(boolean()),

  // Performance options
  enableBatching: optional(boolean()),
  batchSize: optional(number()),
  batchTimeout: optional(number()),
  enableRetries: optional(boolean()),
  maxRetries: optional(number()),
  initialRetryDelay: optional(number()),
  samplingRate: optional(number()),

  // SDK metadata
  sdk: optional(string()),
  sdkVersion: optional(string()),

  // Observability & logging (accepted by SDK config)
  enableObservability: optional(boolean()),
  observabilityService: optional(string()),
  observabilityEnvironment: optional(string()),
  observabilityVersion: optional(string()),
  enableLogging: optional(boolean()),
  enableTracing: optional(boolean()),
  enableErrorTracking: optional(boolean()),
})

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
      },
    }
  }, _options)
}
