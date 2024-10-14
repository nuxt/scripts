---
title: Lemon Squeezy
description: Use Lemon Squeezy in your Nuxt app.
links:
  - label: useScriptLemonSqueezy
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/lemon-squeezy.ts
    size: xs
  - label: "<ScriptLemonSqueezy>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptLemonSqueezy.vue
    size: xs
---

[Lemon Squeezy](https://www.lemonsqueezy.com/) is a popular payment gateway that allows you to accept payments online.

Nuxt Scripts provides a [useScriptLemonSqueezy](#usescriptlemonsqueezy) composable and a headless Facade Component [ScriptLemonSqueezy](#scriptlemonsqueezy) component to interact with lemon squeezy.


## ScriptLemonSqueezy

The `ScriptLemonSqueezy` component is headless [Facade Component](/docs/guides/facade-components) wrapping the [useScriptLemonSqueezy](#useScriptLemonSqueezy) composable, providing a simple, performance optimized way to load Lemon Squeezy in your Nuxt app.

```vue
<template>
<ScriptLemonSqueezy>
  <NuxtLink href="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1">
    Buy me - $9.99
  </NuxtLink>
</ScriptLemonSqueezy>
</template>
```

It works by injecting a `.lemonsqueezy-button` class onto any `a` tags within the component then loading in
the Lemon Squeezy script with the `visibility` [Element Event Trigger](/docs/guides/script-triggers#element-event-triggers).

### Demo

::code-group

:lemon-squeezy-demo{label="Output"}

```vue [Input]
<script lang="ts" setup>
const ready = ref(false)
const events = ref([])
</script>

<template>
<div class="not-prose w-full">
  <div class="flex items-center justify-center p-5">
    <ScriptLemonSqueezy @lemon-squeezy-event="e => events.push(e)" @ready="ready = true">
      <UButton to="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1" class="block mb-3">
        Buy me - $9.99
      </UButton>
      <UButton to="https://harlantest.lemonsqueezy.com/buy/76bbfa74-a81a-4111-8449-4f5ad564ed76?embed=1" class="block">
        Buy me - pay what you want
      </UButton>
    </ScriptLemonSqueezy>
  </div>
  <div>
    <UAlert v-if="!ready" class="mb-5" size="sm" color="blue" variant="soft" title="Lemon Squeezy is not loaded" description="It loads in when the DOM element is within the viewport." />
    <UAlert v-else color="green" variant="soft" title="Lemon Squeezy is loaded">
      <template #description>
      <div class="mb-2">
        Buttons are live and will open the modal, tracking events:
      </div>
      <div v-for="event in events" class="text-xs">
        {{ event.event }}
      </div>
      </template>
    </UAlert>
  </div>
</div>
</template>
```

::

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Events

***`lemon-squeezy-event`***

Events emitted by the Lemon.js script are forwarded through this event. The payload is an object with an `event` key and a `data` key.

```ts
export type LemonSqueezyEventPayload = { event: 'Checkout.Success', data: Record<string, any> }
  & { event: 'Checkout.ViewCart', data: Record<string, any> }
  & { event: 'GA.ViewCart', data: Record<string, any> }
  & { event: 'PaymentMethodUpdate.Mounted' }
  & { event: 'PaymentMethodUpdate.Closed' }
  & { event: 'PaymentMethodUpdate.Updated' }
  & { event: string }
  ```

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
    eventHandler: (event: { event: 'Checkout.Success', data: Record<string, any> }
      & { event: 'Checkout.ViewCart', data: Record<string, any> }
      & { event: 'GA.ViewCart', data: Record<string, any> }
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
const { proxy } = useScriptLemonSqueezy()
onMounted(() => {
  proxy.Setup()
})
</script>

<template>
  <a href="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1" class="lemonsqueezy-button" />
</template>
```
