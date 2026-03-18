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
            window.mixpanel = window.mixpanel || [] as any
            for (const method of methods) {
              (window.mixpanel as any)[method] = (window.mixpanel as any)[method] || ((...args: any[]) => {
                (window.mixpanel as any).push([method, ...args])
              })
            }
            window.mixpanel.people = window.mixpanel.people || {} as any
            for (const method of peopleMethods) {
              (window.mixpanel.people as any)[method] = (window.mixpanel.people as any)[method] || ((...args: any[]) => {
                (window.mixpanel as any).push([`people.${method}`, ...args])
              })
            }
            window.mixpanel.init = window.mixpanel.init || ((...args: any[]) => {
              (window.mixpanel as any).push(['init', ...args])
            })
            if (options?.token) {
              window.mixpanel.init(options.token)
            }
          },
    }
  }, _options)
}
