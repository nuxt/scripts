---
title: Google Analytics
description: Use Google Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-analytics.ts
    size: xs
---

[Google Analytics](https://marketingplatform.google.com/about/analytics/) is a great analytics solution for Nuxt Apps.

It provides detailed insights into how your website is performing, how users are interacting with your content, and how they are navigating through your site.

The `useGoogleAnalytics` composable function allows you to include [Google Analytics 4](https://developers.google.com/analytics/devguides/collection/ga4) in your Nuxt application.

::callout
If Google Tag Manager is already included in your application, you can configure Google Analytics directly using it, rather than including Google Analytics as a separate component. Refer to the [documentation](https://developers.google.com/analytics/devguides/collection/ga4/tag-options#what-is-gtm) to learn more about the differences between Tag Manager and gtag.js.
::

## Nuxt Config

The simplest way to load Google Analytics globally in your Nuxt App is to use your Nuxt config and provide the id
as a string.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAnalytics: {
        id: 'YOUR_ID'
      }
    }
  }
})
```

If you'd like to avoid loading the analytics in development, you can conditionally set the config.

```ts [nuxt.config.ts]
import { isDevelopment } from 'std-env'

export default defineNuxtConfig({
  scripts: {
    registry: {
      // only load Google Analytics in production
      googleAnalytics: isDevelopment
        ? undefined
        : {
            id: 'YOUR_ID',
          }
    }
  }
})
```

### With Environment Variables

If you prefer to configure your id using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: {
          id: '', // NUXT_SCRIPTS_CLOUDFLARE_WEB_ANALYTICS_TOKEN
        },
      },
    },
  },
})
```

```text [.env]
NUXT_SCRIPTS_CLOUDFLARE_WEB_ANALYTICS_TOKEN=<YOUR_TOKEN>
```

## Composable `useScriptgoogleAnalytics`

The `useScriptgoogleAnalytics` composable lets you have fine-grain control over when and how Google Analytics is loaded on your site.

```ts
useScriptgoogleAnalytics(options)
```

## Defaults

- **Trigger**: Script will load when the Nuxt is hydrating to keep web vital metrics accurate.

## Options

```ts
export const googleAnalyticsOptions = object({
  /**
   * The Google Analytics id.
   */
  id: string([minLength(32)]),
  /**
   * Google Analytics enables measuring SPAs automatically by overriding the History API’s pushState function
   * and listening to the onpopstate. Hash-based router is not supported.
   *
   * @default true
   */
  spa: optional(boolean()),
})
```

## Return values

The Google Analytics composable injects a `window.__cfBeacon` object into the global scope. If you need
to access this you can do by awaiting the script.

```ts
const { $script } = useScriptgoogleAnalytics()
$script.then(({ cfBeacon }) => {
  console.log(cfBeacon)
})
```

## Example

Loading Google Analytics through the `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup>
useScriptgoogleAnalytics({
  id: '12ee46bf598b45c2868bbc07a3073f58',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```
