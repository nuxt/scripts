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

Nuxt Scripts provides a registry script composable [`useScriptAhrefsAnalytics()`{lang="ts"}](/scripts/ahrefs-analytics) to integrate it in your Nuxt app.

::script-stats
::

::script-docs
::

::script-types
::

## Examples

### Basic usage

The script auto-fires a page-view on initial load and tracks SPA navigations natively by patching `history.pushState` and listening for `popstate`. Provide your project key and the integration is done.

```vue
<script setup lang="ts">
useScriptAhrefsAnalytics({
  key: 'your-project-key',
})
</script>
```

### Tracking custom events

Use `proxy.AhrefsAnalytics.sendEvent()`{lang="ts"} to send custom events from your components.

```vue
<script setup lang="ts">
const { proxy } = useScriptAhrefsAnalytics({
  key: 'your-project-key',
})

function trackSignup() {
  proxy.AhrefsAnalytics.sendEvent('signup', {
    props: { plan: 'pro' },
  })
}
</script>
```

### SPA navigation tracking

Ahrefs Analytics tracks single-page-app navigations automatically: the loaded `analytics.js` patches `history.pushState` and listens for `popstate`, firing a fresh page-view whenever the URL changes. No extra configuration is needed for Nuxt route changes.
