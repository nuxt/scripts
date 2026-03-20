---
title: Mixpanel
description: Use Mixpanel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/mixpanel-analytics.ts
  size: xs
---

[Mixpanel](https://mixpanel.com) is a product analytics platform that helps you understand how users interact with your application through event tracking, funnels, and retention analysis.

Nuxt Scripts provides a registry script composable [`useScriptMixpanelAnalytics()`{lang="ts"}](/scripts/mixpanel-analytics) to easily integrate Mixpanel in your Nuxt app.

::script-stats
::

::script-docs
::

::script-types
::

## Examples

### Tracking Events

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

function trackSignup() {
  proxy.mixpanel.track('Sign Up', {
    plan: 'premium',
    source: 'landing_page',
  })
}
</script>
```

### Identifying Users

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

function login(userId: string) {
  proxy.mixpanel.identify(userId)
  proxy.mixpanel.people.set({
    $name: 'Jane Doe',
    $email: 'jane@example.com',
    plan: 'premium',
  })
}
</script>
```

### Registering Super Properties

Mixpanel sends super properties with every subsequent event:

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

proxy.mixpanel.register({
  app_version: '2.0.0',
  platform: 'web',
})
</script>
```
