import { boolean, object, optional } from 'valibot'
import type { Stripe } from '@types/stripe-v3'
import { withQuery } from 'ufo'
import { registryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const StripeOptions = object({
  advancedFraudSignals: optional(boolean()),
})

export type StripeInput = RegistryScriptInput<typeof StripeOptions, false>

export interface StripeApi {
  Stripe: Stripe
}

declare global {
  interface Window extends StripeApi {}
}

export function useScriptStripe<T extends StripeApi>(_options?: StripeInput) {
  return registryScript<T, typeof StripeOptions>('stripe', options => ({
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
    schema: StripeOptions,
    scriptOptions: {
      use() {
        return { Stripe: window.Stripe }
      },
    },
  }), _options)
}
