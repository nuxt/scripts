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
    pulse: PulseAnalyticsApi
  }
}

// Calls made before the tracker has loaded are queued on globalThis under a
// Symbol so the queue survives across module instances, and flushed from use().
// This is deliberately not a stub on window.pulse: the tracker runs
// `window.pulse = window.pulse || {}` and then assigns `track`, so a stub's
// queue would be overwritten and lost.
const PULSE_QUEUE_KEY = Symbol.for('nuxt-scripts.pulse-queue')

interface PulseQueueState {
  queue: Array<Parameters<PulseAnalyticsApi['track']>>
  flushed: boolean
}

function getPulseState(): PulseQueueState | undefined {
  if (!import.meta.client)
    return
  const g = globalThis as any
  if (!g[PULSE_QUEUE_KEY]) {
    g[PULSE_QUEUE_KEY] = { queue: [], flushed: false }
  }
  return g[PULSE_QUEUE_KEY]
}

export function useScriptPulseAnalytics<T extends PulseAnalyticsApi>(_options?: PulseAnalyticsInput) {
  const isPulseReady = () => import.meta.client
    && typeof window !== 'undefined'
    && typeof window.pulse?.track === 'function'

  // Replay queued calls once the real tracker is present
  const flushQueue = () => {
    const state = getPulseState()
    if (!state || state.flushed || !isPulseReady())
      return
    state.flushed = true
    while (state.queue.length > 0) {
      const args = state.queue.shift()!
      window.pulse.track(...args)
    }
  }

  const track: PulseAnalyticsApi['track'] = (name, props, revenue) => {
    if (isPulseReady())
      window.pulse.track(name, props, revenue)
    else
      getPulseState()?.queue.push([name, props, revenue])
  }

  return useRegistryScript<T, typeof PulseAnalyticsOptions>('pulseAnalytics', options => ({
    scriptInput: {
      'src': 'https://js.ciphera.net/script.js',
      'data-domain': options.domain,
      'data-api': options.apiUrl || undefined,
      // The tracker treats these as presence flags: the feature is off whenever
      // the attribute exists, whatever its value. `false` must therefore never
      // be written (Unhead renders it as data-no-scroll="false", which still
      // counts as present); an empty string mirrors the documented bare attribute.
      'data-no-scroll': options.trackScroll === false ? '' : undefined,
      'data-no-outbound': options.trackOutbound === false ? '' : undefined,
      'data-no-downloads': options.trackDownloads === false ? '' : undefined,
    },
    schema: import.meta.dev ? PulseAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        // use() runs on status changes; flush as soon as the tracker is loaded
        flushQueue()
        return {
          track,
          cleanPath: () => window.pulse?.cleanPath?.() ?? null,
        } as PulseAnalyticsApi
      },
    },
  }), _options)
}
