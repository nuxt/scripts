---
title: Vercel Analytics
description: Use Vercel Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/vercel-analytics.ts
    size: xs
  - label: Vercel Analytics
    icon: i-simple-icons-vercel
    to: https://vercel.com/docs/analytics
    size: xs
---

[Vercel Analytics](https://vercel.com/docs/analytics) provides lightweight, privacy-friendly web analytics for your Nuxt app. It tracks page views and custom events with zero configuration when deployed on Vercel.

The simplest way to load Vercel Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptVercelAnalytics](#usescriptvercelanalytics) composable.

## Loading Globally

If you'd like to avoid loading the analytics in development, you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) in your Nuxt config.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      vercelAnalytics: true,
    }
  }
})
```

```ts [Production only]
export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        vercelAnalytics: true,
      }
    }
  }
})
```

```ts [Non-Vercel deployment]
export default defineNuxtConfig({
  scripts: {
    registry: {
      vercelAnalytics: {
        dsn: 'YOUR_DSN',
      }
    }
  }
})
```

::

### First-Party Mode

When `scripts.firstParty` is enabled, the analytics script is bundled locally and data collection requests are proxied through your server. This prevents ad blockers from blocking analytics and removes sensitive data from third-party requests.

```ts
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      vercelAnalytics: true,
    }
  }
})
```

## useScriptVercelAnalytics

The `useScriptVercelAnalytics` composable lets you have fine-grain control over when and how Vercel Analytics is loaded on your site.

```ts
function useScriptVercelAnalytics<T extends VercelAnalyticsApi>(_options?: VercelAnalyticsInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

The composable comes with the following defaults:
- **Trigger: Client** Script will load when Nuxt is hydrating to keep web vital metrics accurate.

### VercelAnalyticsInput

```ts
export const VercelAnalyticsOptions = object({
  /**
   * The DSN of the project to send events to.
   * Only required when self-hosting or deploying outside of Vercel.
   */
  dsn: optional(string()),
  /**
   * Whether to disable automatic page view tracking on route changes.
   * Set to true if you want to manually call pageview().
   */
  disableAutoTrack: optional(boolean()),
  /**
   * The mode to use for the analytics script.
   * - `auto` - Automatically detect the environment (default)
   * - `production` - Always use production script
   * - `development` - Always use development script (logs to console)
   */
  mode: optional(union([literal('auto'), literal('development'), literal('production')])),
  /**
   * Whether to enable debug logging.
   * Automatically enabled in development/test environments.
   */
  debug: optional(boolean()),
  /**
   * Custom endpoint for data collection.
   * Useful for self-hosted or proxied setups.
   */
  endpoint: optional(string()),
})
```

You can also pass a `beforeSend` callback to filter or modify events before they are sent:

```ts
type BeforeSendEvent = { type: 'pageview' | 'event', url: string }
type BeforeSend = (event: BeforeSendEvent) => BeforeSendEvent | null
```

### VercelAnalyticsApi

```ts
export interface VercelAnalyticsApi {
  va: (event: string, properties?: unknown) => void
  track: (name: string, properties?: Record<string, AllowedPropertyValues>) => void
  pageview: (options?: { route?: string | null, path?: string }) => void
}
```

::callout{icon="i-heroicons-light-bulb"}
The `track()` method validates properties at runtime — nested objects are silently stripped in production, and throw an error in development.
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
    if (event.url.includes('/admin')) return null
    return event
  },
})
</script>
```
