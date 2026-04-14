---
title: PayPal
description: Use PayPal in your Nuxt app.
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

[PayPal](https://www.paypal.com) is a popular payment gateway that allows you to accept payments online.

Nuxt Scripts provides PayPal SDK v6 integration:
- `useScriptPayPal` composable which loads the script `https://www.paypal.com/web-sdk/v6/core`.
- `ScriptPayPalButtons` component that initializes the PayPal SDK v6 instance and exposes it via a scoped slot.
- `ScriptPayPalMessages` component that allows you to use [PayPal Messages](https://developer.paypal.com/sdk/js/reference/) on your site.

::script-stats
::

::script-docs
::

## Types

To use PayPal with full TypeScript support, you will need
to install the `@paypal/paypal-js` dependency.

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
        console.log('Payment approved:', data.orderId)
      },
      onError: (error) => {
        console.error('Payment error:', error)
      },
    })
    await session.start(
      { presentationMode: 'auto' },
      fetch('/api/create-order').then(r => r.json()),
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

#### With Environment Variables

If you prefer to configure your client ID using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      paypal: { trigger: 'onNuxtReady' },
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        paypal: {
          clientId: '', // NUXT_PUBLIC_SCRIPTS_PAYPAL_CLIENT_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_PAYPAL_CLIENT_ID=<YOUR_CLIENT_ID>
```

### Composable

```ts
export function useScriptPayPal<T extends PayPalApi>(_options?: PayPalInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

::script-types
::
