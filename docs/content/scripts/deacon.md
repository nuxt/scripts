---
title: Deacon
description: Add the Deacon chat widget, an AI support agent that answers from your own content, to your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/deacon.ts
    size: xs
---

[Deacon](https://heydeacon.com) is an AI support agent for websites and apps. It answers questions from your own content and says when it doesn't know. The same script also counts page views, goals and JavaScript errors for Deacon's website analytics.

[`useScriptDeacon()`{lang="ts"}](/scripts/deacon) loads the widget and types the `window.Deacon` API it sets up.

::script-stats
::

::script-docs
::

Your key is the `data-key` value in the snippet on the Install page of the Deacon dashboard, and starts with `pk_`. Deacon only runs on the sites listed on that page. A listed domain covers its subdomains, and once the widget has loaded on `localhost`, Install offers to add it in one click.

::code-group

```text [.env]
NUXT_PUBLIC_SCRIPTS_DEACON_KEY=pk_your_widget_key
```

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      deacon: { trigger: 'onNuxtReady' },
    },
  },
})
```

::

The widget brings its own chat button. To use one of yours, hide Deacon's in Appearance in the dashboard and open the chat from your own button:

```vue
<script setup lang="ts">
const { proxy } = useScriptDeacon()
</script>

<template>
  <button @click="proxy.open()">
    Ask a question
  </button>
</template>
```

## Logged-in visitors

In an app people log in to, pass Deacon the details of the person using it. The team then sees their name on the conversation, and they don't have to type their email to get a reply. Deacon doesn't verify these details. Pass `null` when they log out.

```ts
const { proxy } = useScriptDeacon()
const user = useUser() // your own auth state

watch(user, (current) => {
  proxy.identify(current ? { id: current.id, email: current.email, name: current.name } : null)
}, { immediate: true })
```

## Context

`context` passes details Deacon takes into account when it answers, such as the visitor's plan. Everything in `nuxt.config` is the same for every visitor, so pass details about one visitor at runtime with `setContext()`{lang="ts"}, which merges over `context`. A `null` value removes a key. Every value can be read in the page, so never pass a secret.

```ts
const { proxy } = useScriptDeacon()

proxy.setContext({ plan: 'pro', seats: 3 })
```

## Goals

`track()`{lang="ts"} sends a goal to Analytics › Website in Deacon.

```ts
const { proxy } = useScriptDeacon()

proxy.track('Upgraded', { plan: 'pro' })
```

Set `pageViews: false` to send Deacon no page views or JavaScript errors from your app, as you might in an app behind a login. Goals and chat still work.

::script-types
::

::callout
Deacon's loader takes the origin of its own `src` as the address of its chat and API, so this script doesn't support [bundling or first-party mode](/docs/guides/first-party). It loads directly from `heydeacon.com`, with [`crossorigin` turned off](/docs/guides/cors#registry-scripts) because the loader is served without CORS headers.
::
