import { boolean, object, optional } from 'valibot'
import type { Stripe } from '@types/stripe-v3'
import { withQuery } from 'ufo'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions, NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

export const StripeOptions = object({
  advancedFraudSignals: optional(boolean()),
})

export type StripeInput = ScriptDynamicSrcInput<typeof StripeOptions>

export interface StripeApi {
  Stripe: Stripe
}

declare global {
  interface Window extends StripeApi {}
}

export function useScriptStripe<T extends StripeApi>(options?: StripeInput, _scriptOptions?: Omit<NuxtUseScriptIntegrationOptions, 'assetStrategy'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(StripeOptions, options)
    if (import.meta.client)
      _scriptOptions?.beforeInit?.()
  }
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
  }, {
    ...scriptOptions,
    use() {
      return { Stripe: window.Stripe }
    },
  })
}
