---
title: Vercel Analytics
description: Use Vercel Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/vercel-analytics.ts
    size: xs
---

[Vercel Analytics](https://vercel.com/docs/analytics) provides lightweight, privacy-friendly web analytics for your Nuxt app. It tracks page views and custom events with zero configuration when deployed on [Vercel](https://vercel.com).

::script-stats
::

::script-docs
::

### Non-Vercel Deployment

When deploying outside of Vercel, provide your DSN explicitly:

```ts
useScriptVercelAnalytics({
  dsn: 'YOUR_DSN',
})
```

### First-Party Mode

First-party mode is auto-enabled for Vercel Analytics. Nuxt bundles the analytics script locally and proxies data collection requests through your server. This prevents ad blockers from blocking analytics and removes sensitive data from third-party requests.

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      vercelAnalytics: { trigger: 'onNuxtReady' },
    }
  }
})
```

## Defaults

- **Trigger: Client** Script will load when Nuxt is hydrating to keep web vital metrics accurate.

You can access the `track` and `pageview` methods as a proxy directly or await the `$script` promise to access the object. It's recommended to use the proxy for any void functions.

::code-group

```ts [Proxy]
const { proxy } = useScriptVercelAnalytics()
proxy.track('signup', { plan: 'pro' })
```

```ts [onLoaded]
const { onLoaded } = useScriptVercelAnalytics()
onLoaded(({ track }) => {
  track('signup', { plan: 'pro' })
})
```

::

::script-types
::

## Example

Loading Vercel Analytics through `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup lang="ts">
const { proxy } = useScriptVercelAnalytics({
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Track a custom event
proxy.track('signup', { plan: 'pro' })
</script>
```

### Manual Tracking

If you want full control over what gets tracked, disable automatic tracking and call `track` / `pageview` manually.

```vue [app.vue]
<script setup lang="ts">
const { proxy } = useScriptVercelAnalytics({
  disableAutoTrack: true,
})

// Track custom event
proxy.track('purchase', { product: 'widget', price: 9.99 })

// Manual pageview
proxy.pageview({ path: '/custom-page' })
</script>
```

### beforeSend

Use `beforeSend` to filter or modify events before they reach Vercel. Return `null` to cancel an event.

```vue [app.vue]
<script setup lang="ts">
const { proxy } = useScriptVercelAnalytics({
  beforeSend(event) {
    // Ignore admin pages
    if (event.url.includes('/admin'))
      return null
    return event
  },
})
</script>
```
