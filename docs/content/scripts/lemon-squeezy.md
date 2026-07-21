---
title: Lemon Squeezy
description: Load Lemon.js or turn checkout links into lazy overlay triggers.
links:
  - label: useScriptLemonSqueezy
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/lemon-squeezy.ts
    size: xs
  - label: "<ScriptLemonSqueezy>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptLemonSqueezy.vue
    size: xs
---

[Lemon Squeezy](https://www.lemonsqueezy.com/) is a merchant-of-record platform for digital products and subscriptions.

Use [`useScriptLemonSqueezy()`{lang="ts"}](#usescriptlemonsqueezy){lang="ts"} for Lemon.js calls. [`<ScriptLemonSqueezy>`{lang="html"}](#scriptlemonsqueezy){lang="html"} turns checkout links into overlay triggers.

::script-stats
::

::script-docs
::

## [`<ScriptLemonSqueezy>`{lang="html"}](/scripts/lemon-squeezy){lang="html"}

The headless [facade component](/docs/guides/facade-components) scans the links present when it mounts. It loads [Lemon.js](https://docs.lemonsqueezy.com/guides/developer-guide/lemonjs) when the component's root enters the viewport.

```vue
<template>
  <ScriptLemonSqueezy>
    <NuxtLink href="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1">
      Buy me for $9.99
    </NuxtLink>
  </ScriptLemonSqueezy>
</template>
```

At mount, it adds the `.lemonsqueezy-button` class to links inside the component. Links inserted later are not scanned. Add the class yourself and call `Refresh()`{lang="ts"}, or remount the component, after adding a checkout link dynamically.

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
          Buy me for $9.99
        </UButton>
        <UButton to="https://harlantest.lemonsqueezy.com/buy/76bbfa74-a81a-4111-8449-4f5ad564ed76?embed=1" class="block">
          Buy me: pay what you want
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
          <div v-for="(event, index) in events" :key="index" class="text-xs">
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

The component forwards [Lemon.js overlay events](https://docs.lemonsqueezy.com/help/lemonjs/handling-events) through this event. The payload contains an `event` name and, for events such as `Checkout.Success`, a `data` object.

::warning
The component emits the correct object at runtime, but the current `LemonSqueezyEventPayload` TypeScript definition intersects mutually exclusive event names and can reduce the payload to `never`. Until the type changes, accept `unknown` at your handler boundary and narrow it to the fields you use.
::

## [`useScriptLemonSqueezy()`{lang="ts"}](/scripts/lemon-squeezy){lang="ts"}

Use [`useScriptLemonSqueezy()`{lang="ts"}](/scripts/lemon-squeezy){lang="ts"} when you need Lemon.js without the checkout-link component.

```ts
export function useScriptLemonSqueezy<T extends LemonSqueezyApi>(_options?: LemonSqueezyInput) {}
```

See [Registry Scripts](/docs/guides/registry-scripts) for trigger and loading options.

If you use the composable without the component and add checkout links after Lemon.js loads, call [`Refresh()`{lang="ts"}](https://docs.lemonsqueezy.com/help/lemonjs/methods) so the SDK attaches overlay listeners to the new links:

```ts
proxy.Refresh()
```

::script-types
::

## Example

Initialize Lemon.js for a payment link:

```vue
<script setup lang="ts">
const { proxy } = useScriptLemonSqueezy()
proxy.Setup({
  eventHandler(event) {
    console.log(event)
  },
})
</script>

<template>
  <a href="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1" class="lemonsqueezy-button">Buy now</a>
</template>
```
