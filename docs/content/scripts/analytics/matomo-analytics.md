---
title: Matomo Analytics
description: Use Matomo Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/matomo-analytics.ts
    size: xs
---

[Matomo Analytics](https://matomo.org/) is a great analytics solution for Nuxt Apps.

It provides detailed insights into how your website is performing, how users are interacting with your content, and how they are navigating through your site.

The simplest way to load Matomo Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptMatomoAnalytics](#useScriptMatomoAnalytics) composable.

## Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      matomoAnalytics: {
        siteId: 'YOUR_SITE_ID'
      }
    }
  }
})
```

```ts [Production only]
export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        matomoAnalytics: {
          siteId: 'YOUR_SITE_ID',
        }
      }
    }
  }
})
```

```ts [Environment Variables]
export default defineNuxtConfig({
  scripts: {
    registry: {
      matomoAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        matomoAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_SITE_ID=<your-id>
          siteId: '', // NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_SITE_ID
        },
      },
    },
  },
})
```

::

## useScriptMatomoAnalytics

The `useScriptMatomoAnalytics` composable lets you have fine-grain control over when and how Matomo Analytics is loaded on your site.

```ts
const matomoAnalytics = useScriptMatomoAnalytics({
  matomoUrl: 'YOUR_MATOMO_URL',
  siteId: 'YOUR_SITE_ID'
})
```

### Using Matomo Whitelabel

For Matomo Whitelabel, set trackerUrl and scriptInput.src to customize tracking.

```ts
const matomoAnalytics = useScriptMatomoAnalytics({
  trackerUrl: 'https://c.staging.cookie3.co/lake',
  scriptInput: {
    src: 'https://cdn.cookie3.co/scripts/analytics/latest/cookie3.analytics.min.js',
  },
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### MatomoAnalyticsApi

```ts
interface MatomoAnalyticsApi {
  _paq: unknown[]
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
// matomoUrl and site are required
export const MatomoAnalyticsOptions = object({
  matomoUrl: string(),
  siteId: string(),
  trackerUrl: optional(string()),
  trackPageView: optional(boolean()),
  enableLinkTracking: optional(boolean()),
  disableCookies: optional(boolean()),
})
```

## Example

Using Matomo Analytics only in production while using `_paq` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptMatomoAnalytics()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  proxy._paq.push(['trackGoal', 1])
}
</script>

<template>
  <div>
    <button @click="sendConversion">
      Send Conversion
    </button>
  </div>
</template>
```

::
