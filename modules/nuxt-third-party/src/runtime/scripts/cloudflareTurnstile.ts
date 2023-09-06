import { defineThirdPartyScript } from '../util'
import { useScript } from '#imports'

export interface CloudflareTurnstileOptions {
  // credits https://github.com/nuxt-modules/turnstile
  /**
   * Every widget has a sitekey. This sitekey is associated with the corresponding widget configuration and is created upon the widget creation.
   */
  sitekey?: string
  /**
   * The widget theme. This can be forced to light or dark by setting the theme accordingly.
   *
   * @default {`auto`}
   */
  theme?: 'dark' | 'light' | 'auto'
  /**
   * The tabindex of Turnstile’s iframe for accessibility purposes.
   * @default {0}
   */
  tabindex?: number
  /**
   * A customer value that can be used to differentiate widgets under the same sitekey in analytics and which is returned upon validation.
   */
  action?: string
  /**
   * A customer payload that can be used to attach customer data to the challenge throughout its issuance and which is returned upon validation.
   */
  cData?: any
  /**
   * A JavaScript callback that is invoked upon success of the challenge. The callback is passed a token that can be validated.
   */
  callback?: (token: string) => void
  /**
   * A JavaScript callback that is invoked when a challenge expires.
   */
  'expired-callback'?: () => void
  /**
   * A JavaScript callback that is invoked when there is a network error.
   */
  'error-callback'?: () => void
}

export interface CloudflareTurnstileApi {
  // TODO full API
  render: (selector: string | HTMLElement, options: { siteKey: string; callback: () => void }) => string | undefined
  getResponse: (widgetId?: string) => string | undefined
  reset: (widgetId?: string) => void
  isExpired: (widgetId?: string) => boolean
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile: CloudflareTurnstileApi
  }
}

export const CloudflareTurnstile = defineThirdPartyScript<CloudflareTurnstileOptions, CloudflareTurnstileApi>({
  setup(options) {
    return useScript<CloudflareTurnstileApi>({
      key: 'cloudflare-turnstile',
      use: () => window.turnstile,
      script: {
        src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
        defer: true,
        async: true,
      },
      // TODO implement full options API
    })
  },
})

export function useCloudflareTurnstile(options?: CloudflareTurnstileOptions) {
  // TODO reactivity
  return CloudflareTurnstile(options)
}
