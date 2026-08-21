import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { AhrefsAnalyticsOptions } from './schemas'

export { AhrefsAnalyticsOptions }

export type AhrefsAnalyticsInput = RegistryScriptInput<typeof AhrefsAnalyticsOptions, true, false>

export interface AhrefsAnalyticsSendEventOptions {
  /** Custom dimensions sent under `props`. */
  props?: Record<string, string>
  /** Arbitrary metadata sent under `meta`. */
  meta?: Record<string, unknown>
  /** Optional callback invoked once the beacon request completes. */
  callback?: (result?: { status?: number }) => void
}

export interface AhrefsAnalyticsInstance {
  /**
   * Manually send an event to Ahrefs Analytics. The script auto-fires
   * page-view events on initial load and on `history.pushState`/`popstate`,
   * so SPA navigations are tracked without calling this.
   */
  sendEvent: (name: string, options?: AhrefsAnalyticsSendEventOptions) => void
}

export interface AhrefsAnalyticsApi {
  AhrefsAnalytics: AhrefsAnalyticsInstance
}

declare global {
  // Declared inline rather than via `extends`: an `extends` clause on the global `Window`
  // surfaces as an unsuppressable TS2430 in consumer code when another package declares it (#852).
  interface Window {
    AhrefsAnalytics: AhrefsAnalyticsApi['AhrefsAnalytics']
  }
}

/**
 * Load Ahrefs Web Analytics and expose its `sendEvent` API.
 *
 * The script attaches `window.AhrefsAnalytics` once loaded, fires an initial
 * page-view, and tracks SPA navigations natively by patching
 * `history.pushState` and listening to `popstate`.
 *
 * @see https://ahrefs.com/web-analytics
 */
export function useScriptAhrefsAnalytics<T extends AhrefsAnalyticsApi>(
  _options?: AhrefsAnalyticsInput,
): UseScriptContext<T> {
  return useRegistryScript<T, typeof AhrefsAnalyticsOptions>('ahrefsAnalytics', options => ({
    scriptInput: {
      'src': 'https://analytics.ahrefs.com/analytics.js',
      'data-key': options.key,
      'crossorigin': false,
    },
    schema: import.meta.dev ? AhrefsAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return { AhrefsAnalytics: window.AhrefsAnalytics }
      },
    },
  }), _options)
}
