---
title: Vercel Analytics
description: Load Vercel Web Analytics and send page views or custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/vercel-analytics.ts
    size: xs
---

[Vercel Web Analytics](https://vercel.com/docs/analytics) records page views and custom events. Its [Privacy and Compliance](https://vercel.com/docs/analytics/privacy-policy) guide documents the collection and visitor identification model.

::script-stats
::

::script-docs
::

### Non-Vercel Deployment

When deploying outside [Vercel](https://vercel.com), provide your DSN explicitly. Its [analytics package reference](https://vercel.com/docs/analytics/package) documents the `dsn` option for this case:

```ts
useScriptVercelAnalytics({
  dsn: 'YOUR_DSN',
})
```

### First-Party Mode

This registry entry enables first-party mode. Nuxt bundles the script locally and proxies intake requests through your server. The proxy anonymizes the client IP to a subnet, but it does not redact event bodies or URLs.

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      vercelAnalytics: { trigger: 'client' },
    }
  }
})
```

## Defaults

- **Trigger: Client** The script loads during Nuxt hydration to keep Web Vitals metrics accurate.

The registry fixes this trigger to `client`. A `scriptOptions.trigger` value passed by the caller is overwritten.

The build environment selects the file: development builds use `script.debug.js`, while production builds use `script.js`. The `mode` option sets Vercel's `window.vam` runtime value; it does not change that file selection. The current `debug` mapping only forwards `debug: false` in development, so `debug: true` does not enable the debug script in a production build.

Call the void-returning `track` and `pageview` methods through the proxy. You can also await `$script` to access the loaded object.

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

Load Vercel Analytics through `app.vue`:

```vue [app.vue]
<script setup lang="ts">
const { proxy } = useScriptVercelAnalytics()

// Track a custom event
proxy.track('signup', { plan: 'pro' })
</script>
```

### Manual Tracking

Disable automatic tracking and call `track` or `pageview` yourself:

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

Use `beforeSend` to filter or modify events before they reach Vercel. Return `null` to cancel an event. This is also where Vercel recommends [redacting sensitive URL data](https://vercel.com/docs/analytics/redacting-sensitive-data).

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
