---
title: Ahrefs Web Analytics
description: Use Ahrefs Web Analytics in your Nuxt app to track page views and custom events with a privacy-first, cookie-less analytics script.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/ahrefs-analytics.ts
    size: xs
---

[Ahrefs Web Analytics](https://ahrefs.com/web-analytics) is a privacy-first, cookie-less web analytics service from [Ahrefs](https://ahrefs.com) that tracks page views and custom events without sharing visitor data with third parties.

::script-stats
::

::script-docs
::

The composable comes with the following defaults:
- **Trigger: Client** Script will load when Nuxt is hydrating.

You can access the `AhrefsAnalytics` object as a proxy directly or await the `$script` promise to access the object. It's recommended to use the proxy for any void functions.

::code-group

```ts [Proxy]
const { proxy } = useScriptAhrefsAnalytics({
  key: 'your-project-key',
})
function trackSignup() {
  proxy.AhrefsAnalytics.sendEvent('signup', {
    props: { plan: 'pro' },
  })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptAhrefsAnalytics({
  key: 'your-project-key',
})
onLoaded(({ AhrefsAnalytics }) => {
  AhrefsAnalytics.sendEvent('signup', {
    props: { plan: 'pro' },
  })
})
```

::

## SPA navigation

Ahrefs Analytics tracks single-page-app navigations natively: the loaded `analytics.js` patches `history.pushState` and listens for `popstate`, firing a fresh page-view whenever the URL changes. No extra configuration is needed for Nuxt route changes.

::script-types
::

## Example

Loading Ahrefs Web Analytics through `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup lang="ts">
useScriptAhrefsAnalytics({
  key: 'your-project-key',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```
