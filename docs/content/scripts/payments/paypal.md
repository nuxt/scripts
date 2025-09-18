---
title: PayPal
description: Use PayPal in your Nuxt app.
links:
  - label: useScriptPayPal
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/paypal.ts
    size: xs
  - label: "<ScriptPayPalButtons>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptPayPalButtons.vue
    size: xs
  - label: "<ScriptPayPalMarks>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptPayPalMarks.vue
    size: xs
  - label: "<ScriptPayPalMessages>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptPayPalMessages.vue
    size: xs
---

[PayPal](https://www.paypal.com) is a popular payment gateway that allows you to accept payments online.

Nuxt Scripts provides multiple PayPal features:
- `useScriptPayPal` composable which loads the script `https://www.paypal.com/sdk/js`.
- `ScriptPayPalButtons` component that allows you to embed [PayPal Buttons](https://developer.paypal.com/sdk/js/reference/#buttons) on your site.
- `ScriptPayPalMarks` component that allows you to embed [PayPal Marks](https://developer.paypal.com/sdk/js/reference/#marks) on your site.
- `ScriptPayPalMessages` component that allows you to embed [PayPal Messages](https://developer.paypal.com/studio/checkout/pay-later/us/customize/reference) on your site.

## Types

To use the PayPal with full TypeScript support, you will need
to install the `@paypal/paypal-js` dependency.

```bash
pnpm add -D @paypal/paypal-js
```
### Demo

::code-group

:pay-pal-demo{label="Output"}

```vue [Input]
<template>
  <div>
    <ScriptPayPalButtons
      class="border border-gray-200 dark:border-gray-800 rounded-lg"
      :button-options="buttonOptions"
      :disabled="disabled"
    />
    <label>
      Disabled
      <input v-model="disabled" type="checkbox">
    </label>
    <ScriptPayPalMarks />
    <ScriptPayPalMessages :messages-options="{ style: { color: 'white-no-border', layout: 'flex' } }" />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { PayPalButtonsComponentOptions } from '@paypal/paypal-js'

  const buttonOptions = computed(() => ({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
    },
    message: { amount: '10.00' },
  } satisfies PayPalButtonsComponentOptions))

  const disabled = ref(false)
</script>
```

::
