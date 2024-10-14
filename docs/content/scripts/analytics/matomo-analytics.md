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

The following config assumes you're using Matomo Cloud with the default `siteId` of `1`. 

If you're self-hosting, you'll need to provide the `matomoUrl` instead. If you have other sites you want to track, you can add them using `siteId`.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      matomoAnalytics: {
        cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
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
          cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
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
          // NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_CLOUD_ID=<your-id>
          cloudId: '', // NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_CLOUD_ID
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
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
})
```

By default, a `siteId` of `1` is used and the page is not tracked. You can enable tracking by setting `trackPageView` to `true`.

```ts
const matomoAnalytics = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
  trackPageView: true,
  siteId: 2,
})
```

If you'd like more control over the tracking, for example to set a custom dimension, you can send events using the `proxy` object.

```ts
const { proxy } = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
})

// set custom dimension
proxy._paq.push(['setCustomDimension', 1, 'value'])
// send page event
proxy._paq.push(['trackPageView'])
```

Please see the [Config Schema](#config-schema) for all available options.

### Using Matomo Self-Hosted

For self-hosted Matomo, set `matomoUrl` to customize tracking, you may need to set the `trackerUrl` if you've customized this.

```ts
const matomoAnalytics = useScriptMatomoAnalytics({
  // e.g. https://your-url.com/tracker.js & https://your-url.com//matomo.php both exists
  matomoUrl: 'https://your-url.com',
})
```

### Using Matomo Whitelabel

For Matomo Whitelabel, set `trackerUrl` and `scriptInput.src` to customize tracking.

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
  matomoUrl: optional(string()),
  siteId: optional(string()),
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
