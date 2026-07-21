---
title: Intercom
description: Load Intercom through a typed command queue or a click-triggered custom launcher.
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

[Intercom](https://www.intercom.com/) provides an in-app messenger for customer conversations.

Use [`useScriptIntercom()`{lang="ts"}](#usescriptintercom){lang="ts"} for direct API calls, or [`<ScriptIntercom>`{lang="html"}](#scriptintercom){lang="html"} for a custom messenger launcher.

::script-stats
::

::script-docs
::

## [`<ScriptIntercom>`{lang="html"}](/scripts/intercom){lang="html"}

The headless facade holds back Intercom until its [element trigger](/docs/guides/script-triggers#element-event-triggers) fires. It listens for `click` by default.

### Demo

::code-group

:intercom-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
const isLoaded = ref(false)
</script>

<template>
  <div>
    <ScriptIntercom app-id="akg5rmxb" alignment="left" :horizontal-padding="50" class="intercom" @ready="isLoaded = true">
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

::warning
The component's `api-base` prop currently forwards `app_base`, but Intercom expects [`api_base`](https://developers.intercom.com/installing-intercom/web/installation). Until that mapping changes, the prop cannot select the EU or Australian data host. Use the composable directly when you need a regional endpoint:

```ts
useScriptIntercom({
  app_id: 'YOUR_APP_ID',
  api_base: 'https://api-iam.eu.intercom.io',
})
```
::

#### With environment variables

After you enable the registry entry, the module creates its public runtime-config fields. Set the app ID without adding a separate `runtimeConfig` block:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      intercom: { trigger: 'onNuxtReady' },
    }
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_INTERCOM_APP_ID=<YOUR_APP_ID>
```

### Events

The [`<ScriptIntercom>`{lang="html"}](/scripts/intercom){lang="html"} component emits `ready` after it mounts the messenger and `error` if the script fails to load.

```ts
const emits = defineEmits<{
  ready: [intercom: ReturnType<typeof useScriptIntercom>]
  error: []
}>()
```

```vue
<script setup lang="ts">
function onReady(intercom) {
  console.log('Intercom is ready', intercom)
}
</script>

<template>
  <ScriptIntercom app-id="YOUR_APP_ID" @ready="onReady" />
</template>
```

### Intercom API

The component exposes its `intercom` instance, which is the return value of `useScriptIntercom()`{lang="ts"}. Call the [Intercom JavaScript API](https://developers.intercom.com/installing-intercom/web/methods) through its proxy:

```vue
<script setup lang="ts">
const intercomEl = ref()

function showMessenger() {
  intercomEl.value?.intercom.proxy.Intercom('show')
}
</script>

<template>
  <ScriptIntercom ref="intercomEl" app-id="YOUR_APP_ID" trigger="immediate" />
  <button @click="showMessenger">
    Open chat
  </button>
</template>
```

### Slots

Use the slots to build the launcher and its loading states.

**default**

The default slot displays content while the facade is visible.

**awaitingLoad**

This slot displays content while Intercom waits for its configured trigger.

```vue
<template>
  <ScriptIntercom app-id="YOUR_APP_ID">
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

`ScriptLoadingIndicator` supplies a visible state and status label:

```vue
<template>
  <ScriptIntercom app-id="YOUR_APP_ID">
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptIntercom>
</template>
```

The component declares an `error` slot, but its loading branch currently wins whenever `isReady` is false, including after a load failure. Use the emitted `error` event to render a fallback outside the component until that branch order is fixed.


## [`useScriptIntercom()`{lang="ts"}](/scripts/intercom){lang="ts"}

Use [`useScriptIntercom()`{lang="ts"}](/scripts/intercom){lang="ts"} when you need the command queue without the launcher component.

```ts
const { proxy } = useScriptIntercom({
  app_id: 'YOUR_APP_ID'
})

// examples
proxy.Intercom('show')
proxy.Intercom('update', { name: 'John Doe' })
```

When an identified user signs out, call `shutdown` before another person uses the same browser. Intercom recommends this to clear the prior user's Messenger session:

```ts
proxy.Intercom('shutdown')
```

See [Registry Scripts](/docs/guides/registry-scripts) for trigger and loading options.

::script-types
::

## Example

Open Intercom from a button:

::code-group

```vue [IntercomButton.vue]
<script setup lang="ts">
const { proxy } = useScriptIntercom({
  app_id: 'YOUR_APP_ID',
})

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
