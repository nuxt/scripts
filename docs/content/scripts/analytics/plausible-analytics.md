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

### Nuxt Config Setup

The simplest way to load Plausible Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptPlausibleAnalytics](#useScriptPlausibleAnalytics) composable.

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

::

#### With Environment Variables

If you prefer to configure your id using environment variables.

```ts [nuxt.config.ts]
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
          domain: '', // NUXT_SCRIPTS_PLAUSIBLE_DOMAIN
        },
      },
    },
  },
})
```

```text [.env]
NUXT_SCRIPTS_PLAUSIBLE_ANALYTICS_DOMAIN=<YOUR_DOMAIN>
```

## useScriptPlausibleAnalytics

The `useScriptPlausibleAnalytics` composable lets you have fine-grain control over when and how Plausible Analytics is loaded on your site.

```ts
const { plausible, $script } = useScriptPlausibleAnalytics({
  domain: 'YOUR_DOMAIN'
})
// example
plausible('event', { name: 'conversion' })
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

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
<script setup>
const { plausible } = useScriptPlausibleAnalytics()

// noop in development, ssr
// just works in production, client
plausible('event', { name: 'conversion-step' })
function sendConversion() {
  plausible('event', { name: 'conversion' })
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

```ts [nuxt.config.ts Mock development]
import { isDevelopment } from 'std-env'

export default defineNuxtConfig({
  scripts: {
    registry: {
      plausibleAnalytics: isDevelopment
        ? 'mock' // script won't load unless manually callined load()
        : {
            domain: 'YOUR_DOMAIN',
          },
    },
  },
})
```

::
