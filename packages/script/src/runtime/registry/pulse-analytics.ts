import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { PulseAnalyticsOptions } from './schemas'

export { PulseAnalyticsOptions }

export type PulseAnalyticsInput = RegistryScriptInput<typeof PulseAnalyticsOptions, false>

export interface PulseAnalyticsApi {
  /**
   * Records a custom event.
   * @param name Event name: letters, numbers and underscores, up to 64 characters.
   * Trimmed and lowercased before storage.
   * @param props Optional properties. Values must be strings; a number or boolean
   * rejects the whole event.
   * @param revenue Optional monetary value, zero or greater.
   * @see https://docs.ciphera.net/pulse/custom-events
   */
  track: (name: string, props?: Record<string, string>, revenue?: number) => void
  /**
   * The current pathname as Pulse records it: trailing slash stripped, root kept
   * as `/`. Returns `null` until the tracker has loaded.
   */
  cleanPath: () => string | null
}

declare global {
  interface Window {
    pulse?: PulseAnalyticsApi
  }
}

// The script proxy records calls made before the script loads and replays them
// once it resolves, so buffering them here too would send every event twice.
function isPulseReady() {
  return typeof window !== 'undefined' && typeof window.pulse?.track === 'function'
}

export function useScriptPulseAnalytics<T extends PulseAnalyticsApi>(_options?: PulseAnalyticsInput) {
  const track: PulseAnalyticsApi['track'] = (name, props, revenue) => {
    if (isPulseReady())
      window.pulse!.track(name, props, revenue)
  }

  return useRegistryScript<T, typeof PulseAnalyticsOptions>('pulseAnalytics', options => ({
    scriptInput: {
      'src': 'https://js.ciphera.net/script.js',
      'data-domain': options.domain,
      'data-api': options.apiUrl || undefined,
      // Presence flags: the tracker reads them with hasAttribute(), so a
      // rendered `data-no-scroll="false"` would still switch scroll tracking off.
      'data-no-scroll': options.trackScroll === false ? '' : undefined,
      'data-no-outbound': options.trackOutbound === false ? '' : undefined,
      'data-no-downloads': options.trackDownloads === false ? '' : undefined,
    },
    schema: import.meta.dev ? PulseAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return {
          track,
          cleanPath: () => window.pulse?.cleanPath?.() ?? null,
        } as PulseAnalyticsApi
      },
    },
  }), _options)
}
