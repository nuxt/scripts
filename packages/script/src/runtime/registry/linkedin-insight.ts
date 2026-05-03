import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useScriptEventPage } from '../composables/useScriptEventPage'
import { useRegistryScript } from '../utils'
import { LinkedInInsightOptions } from './schemas'

export { LinkedInInsightOptions }

/** Resolved input shape for {@link useScriptLinkedInInsight}. */
export type LinkedInInsightInput = RegistryScriptInput<typeof LinkedInInsightOptions, true, false>

/** Per-call parameters for `lintrk('track', …)`. */
interface LintrkTrackParams {
  /** Conversion ID from Campaign Manager. Omit for plain page-view. */
  conversion_id?: number
  /** Per-event dedup ID matching the server-side Conversions API event. */
  event_id?: string
  /** Optional callback fired after the beacon completes. */
  commandCallback?: () => void
  [key: string]: any
}

/** Per-call parameters for `lintrk('setUserData', …)` (enhanced matching). */
interface LintrkUserData {
  /** Plain email; the script SHA-256 hashes it before sending. */
  email: string
}

/**
 * Typed overloads for the global `lintrk` function. Documented commands
 * (`track`, `setUserData`) get strict signatures; an escape-hatch overload
 * keeps undocumented commands callable without losing type safety on the
 * documented ones.
 */
type LintrkFns
  = & ((cmd: 'track', params?: LintrkTrackParams) => void)
    & ((cmd: 'setUserData', data: LintrkUserData) => void)
    & ((cmd: (string & {}), ...args: any[]) => void)

/** Window globals exposed by the LinkedIn Insight Tag once loaded. */
export interface LinkedInInsightApi {
  lintrk: LintrkFns & { q?: unknown[] }
}

declare global {
  interface Window extends LinkedInInsightApi {
    _linkedin_partner_id?: string
    _linkedin_data_partner_ids?: string[]
    _linkedin_event_id?: string
    _wait_for_lintrk?: boolean
    _already_called_lintrk?: boolean
  }
}

/**
 * Load the LinkedIn Insight Tag and expose a typed `lintrk` proxy.
 *
 * Sets the partner ID globals (`_linkedin_partner_id` and
 * `_linkedin_data_partner_ids`), optionally writes `_linkedin_event_id`
 * for page-load Conversions API deduplication, and optionally suppresses
 * the script's built-in auto-page-view (`_wait_for_lintrk`) when the
 * caller opts into SPA route tracking. When `enableAutoSpaTracking` is
 * `true`, fires `lintrk('track')` once per Nuxt `page:finish` (including
 * the initial SSR page).
 *
 * @see https://www.linkedin.com/help/lms/answer/a418880
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication
 */
export function useScriptLinkedInInsight<T extends LinkedInInsightApi>(
  _options?: LinkedInInsightInput,
): UseScriptContext<T> {
  const instance = useRegistryScript<T, typeof LinkedInInsightOptions>('linkedinInsight', options => ({
    scriptInput: {
      src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? LinkedInInsightOptions : undefined,
    scriptOptions: {
      use() {
        return { lintrk: window.lintrk }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const ids = Array.isArray(options.id) ? options.id : [options.id]
          const primary = ids[0]

          // 1. Page-load event ID MUST be set first per LinkedIn dedup doc
          if (options.eventId)
            window._linkedin_event_id = options.eventId

          // 2. Suppress built-in auto-page-view if we own SPA tracking
          if (options.enableAutoSpaTracking)
            window._wait_for_lintrk = true

          // 3. Partner ID globals
          window._linkedin_partner_id = primary
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
          for (const id of ids) {
            if (!window._linkedin_data_partner_ids.includes(id))
              window._linkedin_data_partner_ids.push(id)
          }

          // 4. Stub the lintrk queue (idempotent — only if not already defined).
          // Captures full arity so callers using the (string & {}) escape
          // hatch don't lose extra arguments before the script binds.
          if (!window.lintrk) {
            const lintrk = function (cmd: string, ...args: any[]) {
              ;(lintrk as any).q.push([cmd, ...args])
            } as LinkedInInsightApi['lintrk']
            ;(lintrk as any).q = []
            window.lintrk = lintrk
          }

          // 5. Wire SPA route tracking. Same primitive as
          // runtime/registry/matomo-analytics.ts:90.
          if (options.enableAutoSpaTracking) {
            useScriptEventPage(() => {
              window.lintrk('track')
            })
          }
        },
  }), _options)

  return instance
}
