---
title: PayPal
description: Use PayPal in your Nuxt app.
links:
  - label: useScriptPayPal
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/paypal.ts
    size: xs
  - label: "<ScriptPaypalButtons>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptPaypalButtons.vue
    size: xs
  - label: "<ScriptPaypalMarks>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptPaypalMarks.vue
    size: xs
  - label: "<ScriptPaypalMessages>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptPaypalMessages.vue
    size: xs
---

[PayPal](https://www.paypal.com) is a popular payment gateway that allows you to accept payments online.

Nuxt Scripts provides multiple PayPal features:
- `useScriptPaypal` composable which loads the script `https://www.paypal.com/sdk/js`.
- `ScriptPaypalButtons` component that allows you to embed [PayPal Buttons](https://developer.paypal.com/sdk/js/reference/#buttons) on your site.
- `ScriptPaypalMarks` component that allows you to embed [PayPal Marks](https://developer.paypal.com/sdk/js/reference/#marks) on your site.
- `ScriptPaypalMessages` component that allows you to embed [PayPal Messages](https://developer.paypal.com/studio/checkout/pay-later/us/customize/reference) on your site.

## Types

To use the PayPal with full TypeScript support, you will need
to install the `@paypal/paypal-js` dependency.

```bash
pnpm add -D @paypal/paypal-js
```
