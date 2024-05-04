/// <reference types="stripe-v3" />
import { withQuery } from 'ufo'
import { useRegistryScript } from '../utils'
import { boolean, object, optional } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const StripeOptions = object({
  advancedFraudSignals: optional(boolean()),
})

export type StripeInput = RegistryScriptInput<typeof StripeOptions, false>

export interface StripeApi {
  Stripe: stripe.StripeStatic
}

declare global {
  interface Window extends StripeApi {}
}

export function useScriptStripe<T extends StripeApi>(_options?: StripeInput) {
  return useRegistryScript<T, typeof StripeOptions>('stripe', options => ({
    scriptInput: {
      src: withQuery(
        `https://js.stripe.com/v3/`,
        (typeof options?.advancedFraudSignals === 'boolean' && !options?.advancedFraudSignals) ? { advancedFraudSignals: false } : {},
      ),
      // opt-out of privacy defaults
      // @ts-expect-error TODO add types
      crossorigin: null,
      // @ts-expect-error TODO add types
      referrerpolicy: null,
    },
    schema: import.meta.dev ? StripeOptions : undefined,
    scriptOptions: {
      use() {
        return { Stripe: window.Stripe }
      },
    },
  }), _options)
}
