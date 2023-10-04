import { defu } from 'defu'
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

type WidgetContainer = string | HTMLElement

export interface CloudflareTurnstileApi {
  // TODO full API
  render: (selector: WidgetContainer, options?: Partial<CloudflareTurnstileOptions>) => string | undefined
  getResponse: (widgetId?: WidgetContainer) => string | undefined
  reset: (widgetId?: WidgetContainer) => void
  isExpired: (widgetId?: WidgetContainer) => boolean
  remove: (widgetId?: WidgetContainer) => void
  execute: (container?: WidgetContainer, options?: CloudflareTurnstileOptions) => void
}

declare global {
  interface Window {
    turnstile: CloudflareTurnstileApi
  }
}

function useTurnstile(options: CloudflareTurnstileOptions): CloudflareTurnstileApi {
  if (!options)
    return window.turnstile

  return new Proxy(window.turnstile, {
    get(_, fn: keyof CloudflareTurnstileApi) {
      if (fn === 'render' || fn === 'execute')
        return (container: WidgetContainer, renderOptions: CloudflareTurnstileOptions) => window.turnstile[fn](container, defu(options, renderOptions))

      return window.turnstile[fn]
    },
  })
}

export function useCloudflareTurnstile(options: CloudflareTurnstileOptions) {
  return useScript<CloudflareTurnstileApi>({
    key: 'cloudflare',
    src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    defer: true,
    async: true,
  }, {
    use: () => useTurnstile(options),
  })
}
