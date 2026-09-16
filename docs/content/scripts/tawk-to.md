---
title: Tawk.to
description: Load the Tawk.to live chat widget and drive it through a typed proxy, reactive state, and event listeners.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/tawk-to.ts
    size: xs
---

[Tawk.to](https://www.tawk.to/) is a free live chat widget.

[`useScriptTawkTo()`{lang="ts"}](/scripts/tawk-to) loads the widget, types the `window.Tawk_API` command surface, and bridges the `window` events the embed script dispatches into reactive state and typed listeners.

::script-stats
::

::script-docs
::

Bundling and proxying are both off. Nobody has verified how the embed script resolves its own API origin, or what live-chat polling connections a proxy would end up in front of, so neither capability is declared rather than guessed at.

Find `propertyId` and `widgetId` under **Administration Settings → Channels → Chat Widget** in your Tawk.to dashboard.

::code-group

```ts [Proxy]
const { proxy } = useScriptTawkTo({
  propertyId: 'YOUR_PROPERTY_ID',
  widgetId: 'YOUR_WIDGET_ID',
})

function openChat() {
  proxy.maximize()
}
```

```ts [onLoaded]
const { onLoaded } = useScriptTawkTo({
  propertyId: 'YOUR_PROPERTY_ID',
  widgetId: 'YOUR_WIDGET_ID',
})

onLoaded((Tawk_API) => {
  Tawk_API.maximize()
})
```

::

## Reactive state and events

Tawk's embed script dispatches `window` `CustomEvent`s (`tawkLoad`, `tawkStatusChange`, `tawkChatMaximized`, …) alongside its documented `Tawk_API.onXxx = fn` callback-property API. `useScriptTawkTo()`{lang="ts"} bridges those events into five readonly refs and twenty typed listeners, so you don't have to wire `window.addEventListener` yourself:

```vue
<script setup lang="ts">
const { isHidden, isMinimized, isMaximized, chatStatus, unreadCount, onChatStarted, onChatEnded } = useScriptTawkTo({
  propertyId: 'YOUR_PROPERTY_ID',
  widgetId: 'YOUR_WIDGET_ID',
})

onChatStarted(() => {
  console.log('visitor started a chat')
})
onChatEnded(() => {
  console.log('chat ended')
})
</script>

<template>
  <div v-if="!isHidden">
    {{ chatStatus }} · {{ unreadCount }} unread · {{ isMinimized ? 'minimized' : isMaximized ? 'maximized' : 'default' }}
  </div>
</template>
```

`chatStatus` is Tawk's own online/away/offline operator status (`getStatus()`{lang="ts"}). It's distinct from `status`, the generic script-load state every registry entry exposes.

Every `onXxx` listener returns a teardown function for use with `onScopeDispose`, mirroring the rest of the registry's event-listener helpers.

The state refs are a single instance shared by every `useScriptTawkTo()`{lang="ts"} call on the page (there's only ever one Tawk widget), not one instance per call.

## Getters

`proxy` is fire-and-forget: calls queue until the script loads and replay once it does, but their return value is always discarded, even after loading. That's fine for actions like `proxy.maximize()`{lang="ts"}, which don't return anything meaningful anyway, but it can't carry a real synchronous getter. `getWindowType`, `getStatus`, `isChatMaximized`, `isChatMinimized`, `isChatHidden`, `isChatOngoing`, `isVisitorEngaged`, and `widgetPosition` are exposed directly on `useScriptTawkTo()`{lang="ts"}'s return value instead, calling straight through to `window.Tawk_API`:

```ts
const { getStatus, isChatHidden } = useScriptTawkTo({
  propertyId: 'YOUR_PROPERTY_ID',
  widgetId: 'YOUR_WIDGET_ID',
})

getStatus() // 'online' | 'away' | 'offline' | undefined
isChatHidden() // boolean, false before the widget has loaded
```

## Identifying visitors

`proxy.visitor = {...}` doesn't work for the same reason: unhead's script proxy has no `set` trap, so a property assignment through it never reaches the real `Tawk_API`. Use `setVisitor()`{lang="ts"} instead.

It is pre-load only. Tawk honors `Tawk_API.visitor` before the embed script loads and ignores it afterwards, so once the embed has been requested the call warns and does nothing. Change identity after load with `window.Tawk_API.setAttributes({ name, email, phone, hash })`{lang="ts"}.

```ts
const { proxy, setVisitor } = useScriptTawkTo({
  propertyId: 'YOUR_PROPERTY_ID',
  widgetId: 'YOUR_WIDGET_ID',
})

setVisitor({
  name: 'Jane Doe',
  email: 'jane@example.com',
  // HMAC-SHA256 signature for Secure Mode, generated server-side
  hash: visitorHash,
})
proxy.setAttributes({ plan: 'pro' })
proxy.addTags(['vip'])
```

## Switching properties at runtime

```ts
const { proxy } = useScriptTawkTo({
  propertyId: 'YOUR_PROPERTY_ID',
  widgetId: 'YOUR_WIDGET_ID',
})

proxy.switchWidget({ propertyId: 'OTHER_PROPERTY_ID', widgetId: 'OTHER_WIDGET_ID' })
```

::script-types
::

## Partytown

Do not run Tawk.to under Partytown. The widget renders DOM overlays (the chat bubble, prechat and full chat panels) directly, and the `window` `CustomEvent`s the reactive state and listeners depend on aren't configured for worker forwarding.
