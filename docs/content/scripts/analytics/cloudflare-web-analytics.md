---
title: Cloudflare Web Analytics
description: Use Cloudflare Web Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/cloudflare-web-analytics.ts
    size: xs
---

[Cloudflare Web Analytics](https://developers.cloudflare.com/analytics/web-analytics/) with Nuxt is a great privacy analytics solution. It offers free, privacy-centric analytics for your website. It doesn't gather personal data from your visitors, yet provides detailed insights into your web pages' performance as experienced by your visitors.

## Nuxt Config Setup

The simplest way to load Cloudflare Web Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptCloudflareWebAnalytics](#usescriptcloudflarewebanalytics) composable.

If you'd like to avoid loading the analytics in development, you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) in your Nuxt config.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      cloudflareWebAnalytics: {
        token: 'YOUR_TOKEN_ID'
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
        cloudflareWebAnalytics: {
          token: 'YOUR_TOKEN_ID',
        }
      }
    }
  }
})
```

::

#### With Environment Variables

If you prefer to configure your token using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      cloudflareWebAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        cloudflareWebAnalytics: {
          token: '', // NUXT_SCRIPTS_CLOUDFLARE_WEB_ANALYTICS_TOKEN
        },
      },
    },
  },
})
```

```text [.env]
NUXT_SCRIPTS_CLOUDFLARE_WEB_ANALYTICS_TOKEN=<YOUR_TOKEN>
```

## useScriptCloudflareWebAnalytics

The `useScriptCloudflareWebAnalytics` composable lets you have fine-grain control over when and how Cloudflare Web Analytics is loaded on your site.

```ts
function useScriptCloudflareWebAnalytics<T extends CloudflareWebAnalyticsApi>(_options?: CloudflareWebAnalyticsInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

The composable comes with the following defaults:
- **Trigger: Client** Script will load when the Nuxt is hydrating to keep web vital metrics accurate.

### CloudflareWebAnalyticsInput

```ts
export const CloudflareWebAnalyticsOptions = object({
  /**
   * The Cloudflare Web Analytics token.
   */
  token: string([minLength(32)]),
  /**
   * Cloudflare Web Analytics enables measuring SPAs automatically by overriding the History API’s pushState function
   * and listening to the onpopstate. Hash-based router is not supported.
   *
   * @default true
   */
  spa: optional(boolean()),
})
```

### CloudflareWebAnalyticsApi

```ts
export interface CloudflareWebAnalyticsApi {
  __cfBeacon: {
    load: 'single'
    spa: boolean
    token: string
  }
}
```

## Example

Loading Cloudflare Web Analytics through the `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup>
useScriptCloudflareWebAnalytics({
  token: '12ee46bf598b45c2868bbc07a3073f58',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```

The Cloudflare Web Analytics composable injects a `window.__cfBeacon` object into the global scope. If you need
to access this you can do by awaiting the script.

```ts
const { $script } = useScriptCloudflareWebAnalytics()
$script.then(({ cfBeacon }) => {
  console.log(cfBeacon)
})
```
