import { useRegistryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'

export type LemonSqueezyInput = RegistryScriptInput

export type LemonSqueezyEventPayload = { event: 'Checkout.Success', data: Record<string, any> }
  & { event: 'Checkout.ViewCart', data: Record<string, any> }
  & { event: 'GA.ViewCart', data: Record<string, any> }
  & { event: 'PaymentMethodUpdate.Mounted' }
  & { event: 'PaymentMethodUpdate.Closed' }
  & { event: 'PaymentMethodUpdate.Updated' }
  & { event: string }

// from https://docs.lemonsqueezy.com/help/lemonjs/what-is-lemonjs
export interface LemonSqueezyApi {
  /**
   * Initialises Lemon.js on your page.
   * @param options - An object with a single property, eventHandler, which is a function that will be called when Lemon.js emits an event.
   */
  Setup: (options: {
    eventHandler: (event: LemonSqueezyEventPayload) => void
  }) => void
  /**
   * Refreshes `lemonsqueezy-button` listeners on the page.
   */
  Refresh: () => void

  Url: {
    /**
     * Opens a given Lemon Squeezy URL, typically these are Checkout or Payment Details Update overlays.
     * @param url - The URL to open.
     */
    Open: (url: string) => void

    /**
     * Closes the current opened Lemon Squeezy overlay checkout window.
     */
    Close: () => void
  }
  Affiliate: {
    /**
     * Retrieve the affiliate tracking ID
     */
    GetID: () => string

    /**
     * Append the affiliate tracking parameter to the given URL
     * @param url - The URL to append the affiliate tracking parameter to.
     */
    Build: (url: string) => string
  }
  Loader: {
    /**
     * Show the Lemon.js loader.
     */
    Show: () => void

    /**
     * Hide the Lemon.js loader.
     */
    Hide: () => void
  }
}

declare global {
  interface Window {
    createLemonSqueezy: () => void
    LemonSqueezy: LemonSqueezyApi
  }
}

export function useScriptLemonSqueezy<T extends LemonSqueezyApi>(_options?: LemonSqueezyInput) {
  return useRegistryScript<T>(_options?.key || 'lemonSqueezy', () => ({
    scriptInput: {
      src: 'https://assets.lemonsqueezy.com/lemon.js',
      crossorigin: false,
    },
    scriptOptions: {
      use() {
        if (typeof window.createLemonSqueezy === 'undefined')
          return undefined
        window.createLemonSqueezy()
        return window.LemonSqueezy
      },
    },
  }), _options)
}
