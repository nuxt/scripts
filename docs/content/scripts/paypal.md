---
title: PayPal
description: Load PayPal's JavaScript SDK v6 and create checkout or messaging sessions from Vue components.
links:
  - label: useScriptPayPal
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/paypal.ts
    size: xs
  - label: "<ScriptPayPalButtons>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptPayPalButtons.vue
    size: xs
  - label: "<ScriptPayPalMessages>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptPayPalMessages.vue
    size: xs
---

[PayPal](https://www.paypal.com) provides online checkout and payment APIs.

Nuxt Scripts integrates the [PayPal JavaScript SDK v6](https://developer.paypal.com/sdk/js/reference) through:

- `useScriptPayPal` composable, which loads `https://www.paypal.com/web-sdk/v6/core`.
- `ScriptPayPalButtons` component that initializes the PayPal SDK v6 instance and exposes it via a scoped slot.
- `ScriptPayPalMessages` component for creating a `paypal-messages` session.

::script-stats
::

::script-docs
::

::callout{type="warning"}
The `trigger` prop on `ScriptPayPalButtons` and `ScriptPayPalMessages` currently has no effect on SDK loading or facade state. Configure `scripts.registry.paypal.trigger` when you need to defer the SDK itself.
::

The composable uses PayPal's sandbox endpoint in development and the live endpoint in production unless you set `sandbox` explicitly.

## Types

Install `@paypal/paypal-js` for full TypeScript support.

```bash
pnpm add -D @paypal/paypal-js
```

The v6 types are available from `@paypal/paypal-js/sdk-v6`.

### Demo

::code-group

:pay-pal-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
import type { Components, SdkInstance } from '@paypal/paypal-js/sdk-v6'

const clientId = 'YOUR_CLIENT_ID'

function onSdkReady(instance: SdkInstance<Components[]>) {
  console.log('PayPal SDK v6 ready', instance)
}

async function startPayment(instance?: SdkInstance<Components[]>) {
  if (!instance)
    return

  const eligibility = await instance.findEligibleMethods()
  if (eligibility.isEligible('paypal')) {
    const session = instance.createPayPalOneTimePaymentSession({
      onApprove: async (data) => {
        await fetch(`/api/capture-order/${data.orderId}`, { method: 'POST' })
      },
      onError: (error) => {
        console.error('Payment error:', error)
      },
    })
    await session.start(
      { presentationMode: 'auto' },
      fetch('/api/create-order', { method: 'POST' }).then(r => r.json()),
    )
  }
}
</script>

<template>
  <div>
    <ScriptPayPalButtons
      :client-id="clientId"
      :components="['paypal-payments']"
      page-type="checkout"
      @ready="onSdkReady"
    >
      <template #default="{ sdkInstance }">
        <button @click="startPayment(sdkInstance)">
          Pay with PayPal
        </button>
      </template>
    </ScriptPayPalButtons>
  </div>
</template>
```

::

#### With environment variables

Configure the client ID with an environment variable:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      paypal: { trigger: 'onNuxtReady' },
    }
  },
})
```

The module automatically registers PayPal's public `clientId` runtime-config field, so you can omit a manual `runtimeConfig` block.

```text [.env]
NUXT_PUBLIC_SCRIPTS_PAYPAL_CLIENT_ID=<YOUR_CLIENT_ID>
```

The facade components currently default their `client-id` prop to the literal value `test`. That prop overrides runtime config, so pass the resolved ID to the component explicitly:

```vue
<script setup lang="ts">
const config = useRuntimeConfig()
const clientId = config.public.scripts.paypal.clientId
</script>

<template>
  <ScriptPayPalButtons :client-id="clientId" />
</template>
```

Without that prop, a production build uses PayPal's live endpoint with the `test` client ID.

### Composable

```ts
export function useScriptPayPal<T extends PayPalApi>(_options?: PayPalInput) {}
```

For triggers, proxying, and other script options, see [Registry Scripts](/docs/guides/registry-scripts).

::script-types
::
