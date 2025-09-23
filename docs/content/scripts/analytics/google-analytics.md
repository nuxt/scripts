---
title: Google Analytics
description: Use Google Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-analytics.ts
    size: xs
---

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

::code-group

```ts [Default]
const googleAnalytics = useScriptGoogleAnalytics({
  id: 'YOUR_ID'
})
```

```ts [Environment Variables]
// 1. set .env NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID=<your-id>
// 2. set runtimeConfig.public.scripts.googleAnalytics.id to an empty string or fallback
const googleAnalytics = useScriptGoogleAnalytics()
```

::

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Usage

To interact with the Google Analytics API, it's recommended to use script [proxy](/docs/guides/key-concepts#understanding-proxied-functions).

```ts
const { proxy } = useScriptGoogleAnalytics()

proxy.gtag('event', 'page_view')
```

The proxy exposes the `gtag` and `dataLayer` properties, and you should use them following Google Analytics best practices.

### GoogleAnalyticsApi

```ts
export interface GTag {
  // Initialize gtag.js with timestamp
  (command: 'js', value: Date): void

  // Configure a GA4 property
  (command: 'config', targetId: string, configParams?: ConfigParams): void

  // Get a value from gtag
  (command: 'get', targetId: string, fieldName: string, callback?: (field: any) => void): void

  // Send an event to GA4
  (command: 'event', eventName: DefaultEventName, eventParams?: EventParameters): void

  // Set default parameters for all subsequent events
  (command: 'set', params: GtagCustomParams): void

  // Update consent state
  (command: 'consent', consentArg: 'default' | 'update', consentParams: ConsentOptions): void
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
   * The Google Analytics ID. Optional - allows loading gtag.js without initial configuration.
   */
  id: optional(string()),
  /**
   * The datalayer's name you want it to be associated with
   */
  l: optional(string())
})
```

### Customer/Consumer ID Tracking

For e-commerce or multi-tenant applications where you need to track customer-specific analytics alongside your main tracking:

```vue [ProductPage.vue]
<script setup lang="ts">
// Product page with customer-specific tracking
const route = useRoute()
const pageData = await $fetch(`/api/product/${route.params.id}`)

// Load gtag with a custom dataLayer name for customer tracking
const { proxy: customerGtag, load } = useScriptGoogleAnalytics({
  key: 'gtag-customer',
  l: 'customerDataLayer', // Custom dataLayer name
})

// Configure customer's tracking ID when available
const consumerGtagId = computed(() => pageData?.gtag)

if (consumerGtagId.value) {
  // Configure the customer's GA4 property
  customerGtag.gtag('config', consumerGtagId.value)

  // Send customer-specific events
  customerGtag.gtag('event', 'product_view', {
    item_id: pageData.id,
    customer_id: pageData.customerId,
    value: pageData.price
  })
}
</script>
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
