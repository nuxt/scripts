import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useScriptEventPage } from '../composables/useScriptEventPage'
import { useRegistryScript } from '../utils'
import { LinkedInInsightOptions } from './schemas'

export { LinkedInInsightOptions }

export type LinkedInInsightInput = RegistryScriptInput<typeof LinkedInInsightOptions, true, false>

interface LintrkTrackParams {
  conversion_id?: number
  event_id?: string
  commandCallback?: () => void
  [key: string]: any
}

interface LintrkUserData {
  /** Plain email; the script SHA-256 hashes it before sending. */
  email: string
}

type LintrkFns
  = & ((cmd: 'track', params?: LintrkTrackParams) => void)
    & ((cmd: 'setUserData', data: LintrkUserData) => void)
    & ((cmd: (string & {}), ...args: any[]) => void)

export interface LinkedInInsightApi {
  lintrk: LintrkFns & { q?: unknown[] }
}

declare global {
  interface Window extends LinkedInInsightApi {
    _linkedin_partner_id?: string
    _linkedin_data_partner_ids?: string[]
    _linkedin_event_id?: string
    _wait_for_lintrk?: boolean
  }
}

/**
 * Load the LinkedIn Insight Tag and expose a typed `lintrk` proxy.
 *
 * @see https://www.linkedin.com/help/lms/answer/a418880
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication
 */
export function useScriptLinkedInInsight<T extends LinkedInInsightApi>(
  _options?: LinkedInInsightInput,
): UseScriptContext<T> {
  let enableAutoSpaTracking = false

  const instance = useRegistryScript<T, typeof LinkedInInsightOptions>('linkedinInsight', (options) => {
    enableAutoSpaTracking = !!options.enableAutoSpaTracking
    return {
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

            // _linkedin_event_id must be set before the base code runs.
            // https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication
            if (options.eventId)
              window._linkedin_event_id = options.eventId

            // Suppress the script's built-in auto-page-view; useScriptEventPage
            // (below) owns all page-view tracking when SPA tracking is on, so
            // letting both fire would double-count the initial /collect.
            if (options.enableAutoSpaTracking)
              window._wait_for_lintrk = true

            window._linkedin_partner_id = ids[0]
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
            for (const id of ids) {
              if (!window._linkedin_data_partner_ids.includes(id))
                window._linkedin_data_partner_ids.push(id)
            }

            if (!window.lintrk) {
              const lintrk = function (cmd: string, ...args: any[]) {
                ;(lintrk as any).q.push([cmd, ...args])
              } as LinkedInInsightApi['lintrk']
              ;(lintrk as any).q = []
              window.lintrk = lintrk
            }
          },
    }
  }, _options)

  // Registered per component setup (not inside clientInit) so each new route
  // component owns its own page:finish hook. The previous component's hook
  // tears down via onScopeDispose during unmount, BEFORE page:finish fires
  // for the new route — assumes default <NuxtPage /> lifecycle without a
  // transition. With <NuxtPage keepalive> or a transition that keeps both
  // components alive across page:finish, both hooks would fire and double-
  // count. The "no double-fire" e2e regression guard catches the simple case.
  if (import.meta.client && enableAutoSpaTracking) {
    useScriptEventPage(() => {
      window.lintrk?.('track')
    })
  }

  return instance
}
