---
title: Stripe
description: Use Stripe in your Nuxt app.
links:
  - label: useScriptStripe
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/stripe.ts
    size: xs
  - label: "<ScriptStripePricingTable>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptStripePricingTable.vue
    size: xs
---

[Stripe](https://stripe.com) is a popular payment gateway that allows you to accept payments online.

Nuxt Scripts provides two Stripe features:
- `useScriptStripe` composable which loads the script `https://js.stripe.com/v3/`.
- `ScriptStripePricingTable` component that allows you to embed a [Stripe Pricing Table](https://docs.stripe.com/payments/checkout/pricing-table) on your site using `https://js.stripe.com/v3/pricing-table.js`.

## Types

To use the Stripe with full TypeScript support, you will need
to install the `@stripe/stripe-js` dependency.

```bash
pnpm add -D @stripe/stripe-js
```

## Loading Globally

Stripe recommends loading their script globally on your app to improve fraud detection.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      stripe: true,
    }
  }
})
```

```ts [Production only]
export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        stripe: true,
      }
    }
  }
})
```

::


## ScriptStripePricingTable

The `ScriptStripePricingTable` component allows you to embed a [Stripe Pricing Table](https://docs.stripe.com/payments/checkout/pricing-table) on your site
in an optimized way.

To improve performance it will load the table when it's visible using the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers).

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

### Props

The `ScriptStripePricingTable` component accepts the following props:

- `trigger`: The trigger event to load the Stripe. Default is `mouseover`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.
- `pricing-table-id`: The ID of the Pricing Table you created in the Stripe Dashboard.
- `publishable-key`: Your Stripe publishable key.
- `client-reference-id`: A unique identifier for the client.
- `customer-email`: The email of the customer.
- `customer-session-client-secret`: The client secret of the customer session.


## useScriptStripe

The `useScriptStripe` composable lets you have fine-grain control over the Stripe SDK. It provides a way to load the Stripe SDK and interact with it programmatically.

```ts
export function useScriptStripe<T extends StripeApi>(_options?: StripeInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Options

```ts
export const StripeOptions = object({
  advancedFraudSignals: optional(boolean()),
})
```

### StripeApi

```ts
export interface StripeApi {
  Stripe: stripe.StripeStatic
}
```

## Example

Loading the Stripe SDK and using it to create a payment element.

```vue
<script setup lang="ts">
const paymentEl = ref(null)
const { onLoaded } = useScriptStripe()
onMounted(() => {
  onLoaded(({ Stripe }) => {
    const stripe = Stripe('YOUR_STRIPE_KEY')
    const elements = stripe.elements()
    const paymentElement = elements.create('payment', { /* pass keys */})
    paymentElement.mount(paymentEl.value)
  })
})
</script>

<template>
  <div ref="paymentEl" />
</template>
```
