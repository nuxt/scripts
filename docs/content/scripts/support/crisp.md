---
title: Crisp
description: Show performance-optimized Crisp in your Nuxt app.
links:
  - label: useScriptCrisp
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/crisp.ts
    size: xs
  - label: "<ScriptCrisp>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptCrisp.vue
    size: xs
---

[Crisp](https://crisp.chat/) is a customer messaging platform that lets you communicate with your customers through chat, email, and more.

Nuxt Scripts provides a [useScriptCrisp](#usescriptcrisp) composable and a headless Facade Component [ScriptCrisp](#scriptcrisp) component to interact with crisp.

## ScriptCrisp

The `ScriptCrisp` component is headless Facade Component wrapping the [useScriptCrisp](#usescriptcrisp) composable, providing a simple, performance optimized way to load Crisp in your Nuxt app.

It's optimized for performance by leveraging the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading crisp when specific elements events happen.

By default, it will load on the `click` DOM event.

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
    <ScriptCrisp id="b1021910-7ace-425a-9ef5-07f49e5ce417" class="crisp">
      <template #awaitingLoad>
        <div class="crisp-icon" />
      </template>
      <template #loading>
        <ScriptLoadingIndicator color="black" />
      </template>
    </ScriptCrisp>
  </div>
  <div class="text-center">
    <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click to load" description="Clicking the button to the right will load crisp script" />
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
  box-shadow: 0 4px 10px 0 rgba(0,0,0!important,.05) !important;
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

### Props

- `trigger`: The trigger event to load crisp. Default is `click`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.
- `id`: Crisp ID.
- `runtimeConfig`: Extra configuration options. Used to configure the locale. Same as CRISP_RUNTIME_CONFIG.
- `tokenId`: Associated a session, equivalent to using CRISP_TOKEN_ID variable. Same as CRISP_TOKEN_ID.
- `cookieDomain`: Restrict the domain that crisp cookie is set on. Same as CRISP_COOKIE_DOMAIN.
- `cookieExpiry`: The cookie expiry in seconds. Same as CRISP_COOKIE_EXPIRATION.

See the [Config Schema](#config-schema) for full details.

### Events

The `ScriptCrisp` component emits a single `ready` event when crisp is loaded.

```ts
const emits = defineEmits<{
  ready: [crisp: Crisp]
}>()
```

```vue
<script setup lang="ts">
function onReady(crisp) {
  console.log('Crisp is ready', crisp)
}
</script>

<template>
  <ScriptCrisp @ready="onReady" />
</template>
```

### Slots

**awaitingLoad**

The slot is used to display content while crisp is loading.

```vue
<template>
  <ScriptCrisp>
    <template #awaitingLoad>
    <div style="width: 54px; height: 54px; border-radius: 54px; cursor: pointer; background-color: #1972F5;">
      chat!
    </div>
    </template>
  </ScriptCrisp>
</template>
```

**loading**

The slot is used to display content while crisp is loading.

Tip: You should use the `ScriptLoadingIndicator` by default for accessibility and UX.

```vue
<template>
  <ScriptCrisp>
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptCrisp>
</template>
```

## useScriptCrisp

The `useScriptCrisp` composable lets you have fine-grain control over Crisp SDK. It provides a way to load crisp SDK and interact with it programmatically.

```ts
export function useScriptCrisp<T extends CrispApi>(_options?: CrispInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Config Schema

```ts
export const CrispOptions = object({
  /**
   * Crisp ID.
   */
  id: string(),
  /**
   * Extra configuration options. Used to configure the locale.
   * Same as CRISP_RUNTIME_CONFIG.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/language-customization/
   */
  runtimeConfig: optional(object({
    locale: optional(string()),
  })),
  /**
   * Associated a session, equivalent to using CRISP_TOKEN_ID variable.
   * Same as CRISP_TOKEN_ID.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/session-continuity/
   */
  tokenId: optional(string()),
  /**
   * Restrict the domain that crisp cookie is set on.
   * Same as CRISP_COOKIE_DOMAIN.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/cookie-policies/
   */
  cookieDomain: optional(string()),
  /**
   * The cookie expiry in seconds.
   * Same as CRISP_COOKIE_EXPIRATION.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/cookie-policies/#change-cookie-expiration-date
   */
  cookieExpiry: optional(number()),
})
```

### CrispApi

```ts
export interface CrispApi {
  push: (...args: any[]) => void
  is: (name: 'chat:opened' | 'chat:closed' | 'chat:visible' | 'chat:hidden' | 'chat:small' | 'chat:large' | 'session:ongoing' | 'website:available' | 'overlay:opened' | 'overlay:closed' | string) => boolean
  set: (name: 'message:text' | 'session:data' | 'session:segments' | 'session:event' | 'user:email' | 'user:phone' | 'user:nickname' | 'user:avatar' | 'user:company' | string, value: any) => void
  get: (name: 'chat:unread:count' | 'message:text' | 'session:identifier' | 'session:data' | 'user:email' | 'user:phone' | 'user:nickname' | 'user:avatar' | 'user:company' | string) => any
  do: (name: 'chat:open' | 'chat:close' | 'chat:toggle' | 'chat:show' | 'chat:hide' | 'helpdesk:search' | 'helpdesk:article:open' | 'helpdesk:query' | 'overlay:open' | 'overlay:close' | 'message:send' | 'message:show' | 'message:read' | 'message:thread:start' | 'message:thread:end' | 'session:reset' | 'trigger:run' | string, arg2?: any) => any
  on: (name: 'session:loaded' | 'chat:initiated' | 'chat:opened' | 'chat:closed' | 'message:sent' | 'message:received' | 'message:compose:sent' | 'message:compose:received' | 'user:email:changed' | 'user:phone:changed' | 'user:nickname:changed' | 'user:avatar:changed' | 'website:availability:changed' | 'helpdesk:queried' | string, callback: (...args: any[]) => any) => void
  off: (name: 'session:loaded' | 'chat:initiated' | 'chat:opened' | 'chat:closed' | 'message:sent' | 'message:received' | 'message:compose:sent' | 'message:compose:received' | 'user:email:changed' | 'user:phone:changed' | 'user:nickname:changed' | 'user:avatar:changed' | 'website:availability:changed' | 'helpdesk:queried' | string, callback: (...args: any[]) => any) => void
  config: (options: any) => void
  help: () => void
  [key: string]: any
}
```

For more information, please refer to the [Crisp API documentation](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/).

## Example

Loading the Crisp SDK and interacting with it programmatically.

```vue
<script setup lang="ts">
const crisp = useScriptCrisp({
  id: 'YOUR_ID'
})
crisp.set('user:nickname', 'Harlan')
crisp.do('chat:open')
</script>
```
