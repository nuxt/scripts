---
title: Intercom
description: Use Intercom in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/intercom.ts
    size: xs
  - label: "<ScriptIntercom>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptIntercom.vue
    size: xs
---

[Intercom](https://www.intercom.com/) is a customer messaging platform that helps you build better customer relationships.

Nuxt Scripts provides a [`useScriptIntercom()`{lang="ts"}](#usescriptintercom){lang="ts"} composable and a headless Facade Component [`<ScriptIntercom>`{lang="html"}](#scriptintercom){lang="html"} component to interact with Intercom.

::script-stats
::

::script-docs
::

## [`<ScriptIntercom>`{lang="html"}](/scripts/intercom){lang="html"}


The [`<ScriptIntercom>`{lang="html"}](/scripts/intercom){lang="html"} component is headless Facade Component wrapping the [`useScriptIntercom()`{lang="ts"}](#usescriptintercom){lang="ts"} composable, providing a simple, performance optimized way to load Intercom in your Nuxt app.

It's optimized for performance by using the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading Intercom when specific elements events happen.

By default, it will load on the `click` DOM event.

### Demo

::code-group

:intercom-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
const isLoaded = ref(false)
</script>

<template>
  <div>
    <ScriptIntercom app-id="akg5rmxb" api-base="https://api-iam.intercom.io" alignment="left" :horizontal-padding="50" class="intercom" @ready="isLoaded = true">
      <div style="display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 28 32"><path d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z" /></svg>
      </div>
    </ScriptIntercom>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click to load" description="Clicking the button to the right will load the Intercom script" />
      <UAlert v-else color="green" variant="soft" title="Intercom is loaded" description="The Intercom Facade component is no longer being displayed." />
    </div>
  </div>
</template>

<style>
.intercom {
  display: block;
  position: relative; /* change to fixed */
  z-index: 100000;
  width: 48px;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  background-color: #0071b2;
  filter: drop-shadow(rgba(0, 0, 0, 0.06) 0px 1px 6px) drop-shadow(rgba(0, 0, 0, 0.16) 0px 2px 32px);
}
</style>
```

::

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

#### With Environment Variables

If you prefer to configure your app ID using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      intercom: { trigger: 'onNuxtReady' },
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        intercom: {
          app_id: '', // NUXT_PUBLIC_SCRIPTS_INTERCOM_APP_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_INTERCOM_APP_ID=<YOUR_APP_ID>
```

### Events

The [`<ScriptIntercom>`{lang="html"}](/scripts/intercom){lang="html"} component emits a single `ready` event when Intercom loads.

```ts
const emits = defineEmits<{
  ready: [intercom: Intercom]
}>()
```

```vue
<script setup lang="ts">
function onReady(intercom) {
  console.log('Intercom is ready', intercom)
}
</script>

<template>
  <ScriptIntercom @ready="onReady" />
</template>
```

### Intercom API

The component exposes an `intercom` instance (the return value of `useScriptIntercom()`{lang="ts"}) that you can use to call the Intercom API.

```vue
<script setup lang="ts">
const intercomEl = ref()
onMounted(() => {
  intercomEl.value.intercom.proxy.Intercom('show')
})
</script>

<template>
  <ScriptIntercom ref="intercomEl" />
</template>
```

### Slots

The component provides minimal UI by default, only enough to be functional and accessible. There are a number of slots for you to customize the maps however you like.

**default**

The default slot displays content that will always be visible.

**awaitingLoad**

This slot displays content while Intercom is not loading.

```vue
<template>
  <ScriptIntercom>
    <template #awaitingLoad>
      <div style="width: 54px; height: 54px; border-radius: 54px; cursor: pointer; background-color: #1972F5;">
        chat!
      </div>
    </template>
  </ScriptIntercom>
</template>
```

**loading**

This slot displays content while Intercom is loading.

Tip: You should use the `ScriptLoadingIndicator` by default for accessibility and UX.

```vue
<template>
  <ScriptIntercom>
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptIntercom>
</template>
```


## [`useScriptIntercom()`{lang="ts"}](/scripts/intercom){lang="ts"}

The [`useScriptIntercom()`{lang="ts"}](/scripts/intercom){lang="ts"} composable lets you have fine-grain control over when and how Intercom loads on your site.

```ts
const { proxy } = useScriptIntercom({
  app_id: 'YOUR_APP_ID'
})

// examples
proxy.Intercom('show')
proxy.Intercom('update', { name: 'John Doe' })
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

::script-types
::

## Example

Using Intercom only in production.

::code-group

```vue [IntercomButton.vue]
<script setup lang="ts">
const { proxy } = useScriptIntercom()

// noop in development, ssr
// just works in production, client
function showIntercom() {
  proxy.Intercom('show')
}
</script>

<template>
  <div>
    <button @click="showIntercom">
      Chat with us
    </button>
  </div>
</template>
```


::
