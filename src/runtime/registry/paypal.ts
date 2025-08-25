import { withQuery } from 'ufo'
import type { PayPalNamespace } from '@paypal/paypal-js'
import { useRegistryScript } from '../utils'
import { object, string, optional, array, union, boolean } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export interface PaypalApi {
  paypal: PayPalNamespace
}

declare global {
  interface Window extends PaypalApi {
  }
}

export const PaypalOptions = object({
  clientId: string(),
  buyerCountry: optional(string()),
  commit: optional(string()),
  components: optional(union([string(), array(string())])),
  currency: optional(string()),
  debug: optional(union([string(), boolean()])),
  disableFunding: optional(union([string(), array(string())])),
  enableFunding: optional(union([string(), array(string())])),
  integrationDate: optional(string()),
  intent: optional(string()),
  locale: optional(string()),
  /**
   * loadScript() supports an array for merchantId, even though
   * merchant-id technically may not contain multiple values.
   * For an array with a length of > 1 it automatically sets
   * merchantId to "*" and moves the actual values to dataMerchantId
   */
  merchantId: optional(union([string(), array(string())])),
  partnerAttributionId: optional(string()),
  vault: optional(union([string(), boolean()])),
  // own props
  sandbox: optional(boolean()),
})

export type PaypalInput = RegistryScriptInput<typeof PaypalOptions>

export function useScriptPaypal<T extends PaypalApi>(_options?: PaypalInput) {
  return useRegistryScript<T, typeof PaypalOptions>('paypal', (options) => {
    let dataMerchantId = undefined

    if (Array.isArray(options?.merchantId) && options?.merchantId.length > 1) {
      dataMerchantId = JSON.stringify(options.merchantId)
      options.merchantId = '*'
    }

    if (Array.isArray(options?.components)) {
      options.components = options.components.join(',')
    }

    if (Array.isArray(options?.disableFunding)) {
      options.disableFunding = options.disableFunding.join(',')
    }

    if (Array.isArray(options?.enableFunding)) {
      options.enableFunding = options.enableFunding.join(',')
    }

    if (options?.sandbox === undefined) {
      options.sandbox = import.meta.dev
    }

    let components = ['buttons', 'messages', 'marks', 'card-fields', 'funding-eligibility'].join(',')

    if (options.components) {
      if (Array.isArray(options.components)) {
        components = options.components.join(',')
      }
      else {
        components = options.components
      }
    }

    return {
      scriptInput: {
        'src': withQuery(options.sandbox ? 'https://www.sandbox.paypal.com/sdk/js' : 'https://www.paypal.com/sdk/js', {
          'client-id': options.clientId,
          'buyer-country': options.buyerCountry,
          'commit': options.commit,
          'components': components,
          'currency': options.currency,
          'debug': options.debug,
          'disable-funding': options.disableFunding,
          'enable-funding': options.enableFunding,
          'integration-date': options.integrationDate,
          'intent': options.intent,
          'locale': options.locale,
          'vault': options.vault,
        }),
        'data-merchant-id': dataMerchantId,
        'data-partner-attribution-id': options.partnerAttributionId, // TODO: maybe nuxt specific default
      },
      schema: import.meta.dev ? PaypalOptions : undefined,
      // trigger: 'client',
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
