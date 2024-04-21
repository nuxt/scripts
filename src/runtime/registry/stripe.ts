import { boolean, object, optional } from 'valibot'
import type { Stripe } from '@types/stripe-v3'
import { withQuery } from 'ufo'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
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

export function useScriptStripe<T extends StripeApi>(options?: StripeInput) {
  return useScript<T>({
    src: withQuery(
      `https://js.stripe.com/v3/`,
      (typeof options?.advancedFraudSignals === 'boolean' && !options?.advancedFraudSignals) ? { advancedFraudSignals: false } : {},
    ),
    // opt-out of privacy defaults
    // @ts-expect-error TODO add types
    crossorigin: null,
    // @ts-expect-error TODO add types
    referrerpolicy: null,
    ...options?.scriptInput,
  }, {
    ...registryScriptOptions({
      schema: StripeOptions,
      options,
    }),
    use() {
      return { Stripe: window.Stripe }
    },
  })
}
