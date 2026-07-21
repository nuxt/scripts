---
title: Crisp
description: Add a lazy-loaded Crisp chat launcher to your Nuxt app.
links:
  - label: useScriptCrisp
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/crisp.ts
    size: xs
  - label: "<ScriptCrisp>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptCrisp.vue
    size: xs
---

[Crisp](https://crisp.chat/) combines live chat, email, and other customer-messaging channels.

Use [`useScriptCrisp()`{lang="ts"}](#usescriptcrisp){lang="ts"} for direct SDK calls, or [`<ScriptCrisp>`{lang="html"}](#scriptcrisp){lang="html"} for a custom chat launcher.

::script-stats
::

::script-docs
::

## [`<ScriptCrisp>`{lang="html"}](/scripts/crisp){lang="html"}

The headless facade holds back the Crisp SDK until its [element trigger](/docs/guides/script-triggers#element-event-triggers) fires. It listens for `click` by default.

### Demo

::code-group

:crisp-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
const isLoaded = ref(false)
</script>

<template>
  <div class="not-prose">
    <div class="flex items-center justify-center p-5">
      <ScriptCrisp id="b1021910-7ace-425a-9ef5-07f49e5ce417" class="crisp" @ready="isLoaded = true">
        <template #awaitingLoad>
          <div class="crisp-icon" />
        </template>
        <template #loading>
          <ScriptLoadingIndicator color="black" />
        </template>
      </ScriptCrisp>
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click to load" description="Clicking the button to the right will load the Crisp script." />
      <UAlert v-else color="green" variant="soft" title="Crisp is loaded" description="The Crisp Facade component is no longer being displayed." />
    </div>
  </div>
</template>

<style>
.crisp {
  width: 54px;
  height: 54px;
  border-radius: 54px;
  cursor: pointer;
  background-color: #1972F5;
  position: relative; /* change to fixed */
  bottom: 20px;
  right: 24px;
  z-index: 100000;
  box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.05);
}
.crisp-icon {
  position: absolute;
  top: 16px;
  left: 11px;
  width: 32px;
  height: 26px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjMwIiB3aWR0aD0iMzUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxmaWx0ZXIgaWQ9ImEiIGhlaWdodD0iMTM4LjclIiB3aWR0aD0iMTMxLjQlIiB4PSItMTUuNyUiIHk9Ii0xNS4xJSI+PGZlTW9ycGhvbG9neSBpbj0iU291cmNlQWxwaGEiIG9wZXJhdG9yPSJkaWxhdGUiIHJhZGl1cz0iMSIgcmVzdWx0PSJzaGFkb3dTcHJlYWRPdXRlcjEiLz48ZmVPZmZzZXQgZHk9IjEiIGluPSJzaGFkb3dTcHJlYWRPdXRlcjEiIHJlc3VsdD0ic2hhZG93T2Zmc2V0T3V0ZXIxIi8+PGZlR2F1c3NpYW5CbHVyIGluPSJzaGFkb3dPZmZzZXRPdXRlcjEiIHJlc3VsdD0ic2hhZG93Qmx1ck91dGVyMSIgc3RkRGV2aWF0aW9uPSIxIi8+PGZlQ29tcG9zaXRlIGluPSJzaGFkb3dCbHVyT3V0ZXIxIiBpbjI9IlNvdXJjZUFscGhhIiBvcGVyYXRvcj0ib3V0IiByZXN1bHQ9InNoYWRvd0JsdXJPdXRlcjEiLz48ZmVDb2xvck1hdHJpeCBpbj0ic2hhZG93Qmx1ck91dGVyMSIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjA3IDAiLz48L2ZpbHRlcj48cGF0aCBpZD0iYiIgZD0iTTE0LjIzIDIwLjQ2bC05LjY1IDEuMUwzIDUuMTIgMzAuMDcgMmwxLjU4IDE2LjQ2LTkuMzcgMS4wNy0zLjUgNS43Mi00LjU1LTQuOHoiLz48L2RlZnM+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48dXNlIGZpbGw9IiMwMDAiIGZpbHRlcj0idXJsKCNhKSIgeGxpbms6aHJlZj0iI2IiLz48dXNlIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIiB4bGluazpocmVmPSIjYiIvPjwvZz48L3N2Zz4=)!important
}
@media (max-height: 600px) {
  .crisp {
    bottom: 14px;
    right: 14px;
  }
}
</style>
```

::

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

#### With environment variables

You can configure the Crisp website ID with an environment variable.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      crisp: { trigger: 'onNuxtReady' },
    }
  },
  // Public runtime config receives the environment variable.
  runtimeConfig: {
    public: {
      scripts: {
        crisp: {
          id: '', // NUXT_PUBLIC_SCRIPTS_CRISP_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_CRISP_ID=<YOUR_ID>
```

### Events

The [`<ScriptCrisp>`{lang="html"}](/scripts/crisp){lang="html"} component emits `ready` after it mounts the chatbox and `error` if the script fails to load.

::callout{color="amber"}
The current template checks `status === 'loading' || !isReady` before its `error` branch, so the named `#error` slot is unreachable. Listen for `@error` and render fallback UI outside the component until that ordering bug is fixed.
::

```ts
const emits = defineEmits<{
  ready: [crisp: ReturnType<typeof useScriptCrisp>]
  error: []
}>()
```

```vue
<script setup lang="ts">
function onReady(crisp) {
  console.log('Crisp is ready', crisp)
}
</script>

<template>
  <ScriptCrisp id="YOUR_ID" @ready="onReady" />
</template>
```

### Slots

**awaitingLoad**

This slot displays content while Crisp waits for its configured trigger.

```vue
<template>
  <ScriptCrisp id="YOUR_ID">
    <template #awaitingLoad>
      <div style="width: 54px; height: 54px; border-radius: 54px; cursor: pointer; background-color: #1972F5;">
        chat!
      </div>
    </template>
  </ScriptCrisp>
</template>
```

**loading**

This slot displays content while Crisp is loading.

`ScriptLoadingIndicator` provides the module's standard accessible loading state.

```vue
<template>
  <ScriptCrisp id="YOUR_ID">
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptCrisp>
</template>
```

## [`useScriptCrisp()`{lang="ts"}](/scripts/crisp){lang="ts"}

Use [`useScriptCrisp()`{lang="ts"}](/scripts/crisp){lang="ts"} when you need to call Crisp without the launcher component.

```ts
export function useScriptCrisp<T extends CrispApi>(_options?: CrispInput) {}
```

See [Registry Scripts](/docs/guides/registry-scripts) for trigger and loading options, and the [Crisp API documentation](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/) for available commands.

::script-types
::

## Example

Call Crisp through the proxy:

```vue
<script setup lang="ts">
const { proxy } = useScriptCrisp({
  id: 'YOUR_ID'
})
proxy.set('user:nickname', 'Harlan')
proxy.do('chat:open')
</script>
```
