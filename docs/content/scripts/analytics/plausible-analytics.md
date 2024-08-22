---
title: Plausible Analytics
description: Use Plausible Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/plausible-analytics.ts
    size: xs
---

[Plausible Analytics](https://plausible.io/) is a privacy-friendly analytics solution for Nuxt Apps, allowing you to track your website's traffic without compromising your users' privacy.

The simplest way to load Plausible Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptPlausibleAnalytics](#useScriptPlausibleAnalytics) composable.

## Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      plausibleAnalytics: {
        domain: 'YOUR_DOMAIN'
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
        plausibleAnalytics: {
          domain: 'YOUR_DOMAIN',
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
      plausibleAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        plausibleAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_PLAUSIBLE_ANALYTICS_DOMAIN=<your-domin>
          domain: ''
        },
      },
    },
  },
})
```

::

## useScriptPlausibleAnalytics

The `useScriptPlausibleAnalytics` composable lets you have fine-grain control over when and how Plausible Analytics is loaded on your site.

```ts
const plausible = useScriptPlausibleAnalytics({
  domain: 'YOUR_DOMAIN'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Self-hosted Plausible

If you are using a self-hosted version of Plausible, you will need to provide an explicit src for the script so that
the API events are sent to the correct endpoint.

```ts
useScriptPlausible({
  scriptInput: {
    src: 'https://my-self-hosted-plausible.io/js/script.js'
  }
})
```

### PlausibleAnalyticsApi

```ts
export interface PlausibleAnalyticsApi {
  plausible: ((event: '404', options: Record<string, any>) => void) &
  ((event: 'event', options: Record<string, any>) => void) &
  ((...params: any[]) => void) & {
    q: any[]
  }
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const PlausibleAnalyticsOptions = object({
  domain: string(), // required
  extension: optional(union([union(extensions), array(union(extensions))])),
})
```

## Example

Using Plausible Analytics only in production while using `plausible` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptPlausibleAnalytics()

// noop in development, ssr
// just works in production, client
proxy.plausible('event', { name: 'conversion-step' })
function sendConversion() {
  proxy.plausible('event', { name: 'conversion' })
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
