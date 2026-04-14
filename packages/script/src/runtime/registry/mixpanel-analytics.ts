import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { MixpanelAnalyticsOptions } from './schemas'

export { MixpanelAnalyticsOptions }

export type MixpanelAnalyticsInput = RegistryScriptInput<typeof MixpanelAnalyticsOptions>

export interface MixpanelAnalyticsApi {
  mixpanel: {
    track: (event: string, properties?: Record<string, any>) => void
    identify: (distinctId: string) => void
    reset: () => void
    people: {
      set: (properties: Record<string, any>) => void
    }
    register: (properties: Record<string, any>) => void
    init: (token: string, config?: Record<string, any>) => void
    /** Opt the user in to tracking. Available after the real SDK loads. */
    opt_in_tracking?: () => void
    /** Opt the user out of tracking. Available after the real SDK loads. */
    opt_out_tracking?: () => void
  }
}

declare global {
  interface Window {
    mixpanel: MixpanelAnalyticsApi['mixpanel']
  }
}

const methods = ['track', 'identify', 'reset', 'register'] as const
const peopleMethods = ['set'] as const

export function useScriptMixpanelAnalytics<T extends MixpanelAnalyticsApi>(_options?: MixpanelAnalyticsInput) {
  return useRegistryScript<T, typeof MixpanelAnalyticsOptions>('mixpanelAnalytics', (options) => {
    return {
      scriptInput: {
        src: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
      },
      schema: import.meta.dev ? MixpanelAnalyticsOptions : undefined,
      scriptOptions: {
        use() {
          return {
            mixpanel: window.mixpanel,
          }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            const mp = (window.mixpanel = (window.mixpanel || []) as any)
            if (!mp.__SV) {
              mp.__SV = 1.2
              mp._i = mp._i || []

              mp.init = (token: string, config?: Record<string, any>, name = 'mixpanel') => {
                const target = name === 'mixpanel' ? mp : (mp[name] = [])
                target.people = target.people || []
                for (const method of methods) {
                  target[method] = (...args: any[]) => {
                    target.push([method, ...args])
                  }
                }
                for (const method of peopleMethods) {
                  target.people[method] = (...args: any[]) => {
                    target.push([`people.${method}`, ...args])
                  }
                }
                mp._i.push([token, config, name])
              }
            }

            if (options?.token) {
              // 'opt-out' is applied on init() via `opt_out_tracking_by_default`, so tracking
              // is suppressed before the first call. 'opt-in' is queued on the `mp` stub with
              // `opt_in_tracking`; the real SDK drains the queue on load and runs it early.
              const optOutByDefault = options?.defaultConsent === 'opt-out'
              mp.init(options.token, optOutByDefault ? { opt_out_tracking_by_default: true } : undefined)
              if (options?.defaultConsent === 'opt-in') {
                // opt_in_tracking isn't part of the stub; push so the real SDK runs it on load.
                mp.push(['opt_in_tracking'])
              }
            }
          },
    }
  }, _options)
}
