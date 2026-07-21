---
title: Stripe
description: Load Stripe.js programmatically or embed a deferred Stripe Pricing Table.
links:
  - label: useScriptStripe
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/stripe.ts
    size: xs
  - label: "<ScriptStripePricingTable>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptStripePricingTable.vue
    size: xs
---

[Stripe](https://stripe.com) provides payment APIs and hosted checkout components.

Nuxt Scripts provides two Stripe features:

- [`useScriptStripe()`{lang="ts"}](/scripts/stripe){lang="ts"} composable which loads the script `https://js.stripe.com/basil/stripe.js` by default. Use the `version` option to [pin a Stripe.js SDK release](https://docs.stripe.com/sdks/stripejs-versioning) (e.g. `acacia`, `clover`, `dahlia`).
- `ScriptStripePricingTable` component for embedding a [Stripe Pricing Table](https://docs.stripe.com/payments/checkout/pricing-table) with `https://js.stripe.com/v3/pricing-table.js`.

::script-stats
::

::script-docs
::

## Types

Install `@stripe/stripe-js` for full TypeScript support.

```bash
pnpm add -D @stripe/stripe-js
```

## Loading Globally

Stripe recommends loading Stripe.js on every page so its [advanced fraud detection](https://docs.stripe.com/disputes/prevention/advanced-fraud-detection) can observe browsing behavior before checkout.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      stripe: { trigger: 'onNuxtReady' },
    }
  }
})
```

```ts [Production only]
export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        stripe: { trigger: 'onNuxtReady' },
      }
    }
  }
})
```

::


## ScriptStripePricingTable

`ScriptStripePricingTable` embeds a [Stripe Pricing Table](https://docs.stripe.com/payments/checkout/pricing-table) and defers its script until the component is visible.

An [Element Event Trigger](/docs/guides/script-triggers#element-event-triggers) delays the pricing table script until the component becomes visible.

::callout
You'll need to create your own [Pricing Table](https://dashboard.stripe.com/pricing-tables) before proceeding.
::

### Demo

::code-group

:stripe-demo{label="Output"}

```vue [Input]
<template>
  <ScriptStripePricingTable
    pricing-table-id="prctbl_1PD0MMEclFNgdHcR8t0Jop2H"
    publishable-key="pk_live_51OhXSKEclFNgdHcRNi5xBjBClxsA0alYgt6NzBwUZ880pLG88rYSCYPQqpzM3TedzNYu5g2AynKiPI5QVLYSorLJ002iD4VZIB"
  />
</template>
```

::

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

## [`useScriptStripe()`{lang="ts"}](/scripts/stripe){lang="ts"}

Use [`useScriptStripe()`{lang="ts"}](/scripts/stripe){lang="ts"} when you need to load Stripe.js and call it programmatically.

```ts
export function useScriptStripe<T extends StripeApi>(_options?: StripeInput) {}
```

For triggers and other script options, see [Registry Scripts](/docs/guides/registry-scripts).

::script-types
::

## Example

This mounts a Payment Element for a $10.99 USD payment. You still need to finish the payment on your server; Stripe's [deferred-intent guide](https://docs.stripe.com/payments/accept-a-payment-deferred) covers the complete flow.

```vue
<script setup lang="ts">
const paymentEl = ref<HTMLElement | null>(null)
const { onLoaded } = useScriptStripe()
onMounted(() => {
  onLoaded(({ Stripe }) => {
    const stripe = Stripe('YOUR_STRIPE_KEY')
    const elements = stripe.elements({
      mode: 'payment',
      amount: 1099,
      currency: 'usd',
    })
    const paymentElement = elements.create('payment')
    if (paymentEl.value)
      paymentElement.mount(paymentEl.value)
  })
})
</script>

<template>
  <div ref="paymentEl" />
</template>
```
