import type { RegistryScriptInput } from '#nuxt-scripts/types'
import type { PayPalV6Namespace } from '@paypal/paypal-js/sdk-v6'
import { useRegistryScript } from '../utils'
import { PayPalOptions } from './schemas'

export { PayPalOptions }

export interface PayPalApi {
  paypal: PayPalV6Namespace
}

declare global {
  interface Window extends PayPalApi {
  }
}

export type PayPalInput = RegistryScriptInput<typeof PayPalOptions>

export function useScriptPayPal<T extends PayPalApi>(_options?: PayPalInput) {
  return useRegistryScript<T, typeof PayPalOptions>('paypal', (options) => {
    if (options?.sandbox === undefined) {
      options.sandbox = import.meta.dev
    }

    return {
      scriptInput: {
        src: options.sandbox
          ? 'https://www.sandbox.paypal.com/web-sdk/v6/core'
          : 'https://www.paypal.com/web-sdk/v6/core',
      },
      schema: import.meta.dev ? PayPalOptions : undefined,
      scriptOptions: {
        use() {
          return {
            paypal: window.paypal,
          }
        },
      },
    }
  }, _options)
}
