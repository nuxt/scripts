---
title: Google Analytics
description: Use Google Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-analytics.ts
    size: xs
---

::tip
This composable is generated with [GoogleChromeLabs/third-party-capital](https://github.com/GoogleChromeLabs/third-party-capital) in collaboration with the [Chrome Aurora team](https://developer.chrome.com/docs/aurora).
::

[Google Analytics](https://marketingplatform.google.com/about/analytics/) is an analytics solution for Nuxt Apps.

It provides detailed insights into how your website is performing, how users are interacting with your content, and how they are navigating through your site.

The simplest way to load Google Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptGoogleAnalytics](#useScriptGoogleAnalytics) composable.

### Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAnalytics: {
        id: 'YOUR_ID',
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
        googleAnalytics: {
          id: 'YOUR_ID',
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
      googleAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID=<your-id>
          id: '',
        },
      },
    },
  },
})
```

::

## useScriptGoogleAnalytics

The `useScriptGoogleAnalytics` composable lets you have fine-grain control over when and how Google Analytics is loaded on your site.

```ts
const googleAnalytics = useScriptGoogleAnalytics({
  id: 'YOUR_ID'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### GoogleAnalyticsApi

```ts
interface GTag {
  (fn: 'js', opt: Date): void
  (fn: 'config', opt: string): void
  (fn: 'event', opt: string, opt2?: {
    [key: string]: any
  }): void
  (fn: 'set', opt: {
    [key: string]: string
  }): void
  (fn: 'get', opt: string): void
  (fn: 'consent', opt: 'default', opt2: {
    [key: string]: string
  }): void
  (fn: 'consent', opt: 'update', opt2: {
    [key: string]: string
  }): void
  (fn: 'config', opt: 'reset'): void
}
interface GoogleAnalyticsApi {
  dataLayer: Record<string, any>[]
  gtag: GTag
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const GoogleAnalyticsOptions = object({
  /**
   * The Google Analytics ID.
   */
  id: string(),
  /**
   * The datalayer's name you want it to be associated with
   */
  dataLayerName: optional(string())
})
```

## Example

Using Google Analytics only in production while using `gtag` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptGoogleAnalytics()

// noop in development, ssr
// just works in production, client
proxy.gtag('event', 'conversion-test')
function sendConversion() {
  proxy.gtag('event', 'conversion')
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
