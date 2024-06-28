---
title: Lemon Squeezy
description: Use Lemon Squeezy in your Nuxt app.
links:
  - label: useScriptLemonSqueezy
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/lemon-squeezy.ts
    size: xs
  - label: "<ScriptLemonSqueezyButton>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptLemonSqueezyButton.vue
    size: xs
---

[Lemon Squeezy](https://www.lemonsqueezy.com/) is a popular payment gateway that allows you to accept payments online.

## useScriptLemonSqueezy

The `useScriptLemonSqueezy` composable lets you have fine-grain control over the Lemon Squeezy SDK. It provides a way to load the Lemon Squeezy SDK and interact with it programmatically.

```ts
export function useScriptLemonSqueezy<T extends LemonSqueezyApi>(_options?: LemonSqueezyInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### LemonSqueezyApi

```ts
export interface LemonSqueezyApi {
  /**
   * Initialises Lemon.js on your page.
   * @param options - An object with a single property, eventHandler, which is a function that will be called when Lemon.js emits an event.
   */
  Setup: (options: {
    eventHandler: (event:
      { event: 'Checkout.Success', data: Record<string, any> }
      & { event: 'PaymentMethodUpdate.Mounted' }
      & { event: 'PaymentMethodUpdate.Closed' }
      & { event: 'PaymentMethodUpdate.Updated' }
      & { event: string }
    ) => void
  }) => void
  /**
   * Refreshes `lemonsqueezy-button` listeners on the page.
   */
  Refresh: () => void

  Url: {
    /**
     * Opens a given Lemon Squeezy URL, typically these are Checkout or Payment Details Update overlays.
     * @param url - The URL to open.
     */
    Open: (url: string) => void

    /**
     * Closes the current opened Lemon Squeezy overlay checkout window.
     */
    Close: () => void
  }
  Affiliate: {
    /**
     * Retrieve the affiliate tracking ID
     */
    GetID: () => string

    /**
     * Append the affiliate tracking parameter to the given URL
     * @param url - The URL to append the affiliate tracking parameter to.
     */
    Build: (url: string) => string
  }
  Loader: {
    /**
     * Show the Lemon.js loader.
     */
    Show: () => void

    /**
     * Hide the Lemon.js loader.
     */
    Hide: () => void
  }
}
```

## Example

Using the Lemon Squeezy SDK with a payment link.

```vue
<script setup lang="ts">
const { Setup } = useScriptLemonSqueezy()
onMounted(() => {
  Setup()
})
</script>

<template>
  <a href="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1" class="lemonsqueezy-button" />
</template>
```
