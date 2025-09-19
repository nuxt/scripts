import { withQuery } from 'ufo'
import type { StripeConstructor } from '@stripe/stripe-js'
import { useRegistryScript } from '../utils'
import { boolean, object, optional } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const StripeOptions = object({
  advancedFraudSignals: optional(boolean()),
})

export type StripeInput = RegistryScriptInput<typeof StripeOptions, false>

export interface StripeApi {
  Stripe: StripeConstructor
}

export function useScriptStripe<T extends StripeApi>(_options?: StripeInput) {
  return useRegistryScript<T, typeof StripeOptions>('stripe', options => ({
    scriptInput: {
      src: withQuery(
        `https://js.stripe.com/basil/stripe.js`,
        (typeof options?.advancedFraudSignals === 'boolean' && !options?.advancedFraudSignals) ? { advancedFraudSignals: false } : {},
      ),
      // opt-out of privacy defaults
      crossorigin: false,
      referrerpolicy: false,
    },
    schema: import.meta.dev ? StripeOptions : undefined,
    scriptOptions: {
      use() {
        return { Stripe: window.Stripe }
      },
    },
  }), _options)
}
