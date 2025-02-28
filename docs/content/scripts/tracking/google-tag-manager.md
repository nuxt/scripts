---
title: Google Tag Manager
description: Use Google Tag Manager in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-tag-manager.ts
  size: xs
---

[Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) is a tag management system that allows you to quickly and easily update tags and code snippets on your website or mobile app, such as those intended for traffic analysis and marketing optimization.

::callout
You may not need Google Tag Manager with Nuxt Scripts. GTM is 82kb and will slow down your site.
Nuxt Scripts provides many features you can easily
implement within your Nuxt app. If you're using GTM for Google Analytics, you can use the `useScriptGoogleAnalytics` composable instead.
::

## Loading Globally

If you'd like to avoid loading the analytics in development, you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) in your Nuxt config.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: '<YOUR_ID>'
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
        googleTagManager: {
          id: '<YOUR_ID>',
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
      googleTagManager: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        googleTagManager: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_TAG_MANAGER_ID=<your-id>
          id: '', 
        },
      },
    },
  },
})
```

::

## useScriptGoogleTagManager

The `useScriptGoogleTagManager` composable lets you have fine-grain control over when and how Google Tag Manager is loaded on your site.


```ts
const { proxy } = useScriptGoogleTagManager({
  id: 'YOUR_ID' // id is only needed if you haven't configured globally
})
// example
proxy.dataLayer.push({ event: 'conversion', value: 1 })
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about `proxy`.

### Guide: Sending Page Events

If you'd like to manually send page events to Google Tag Manager, you can use the `proxy` with the [useScriptEventPage](/docs/api/use-script-event-page) composable.
This composable will trigger the provided function on route change after the page title has been updated.

```ts
const { proxy } = useScriptGoogleTagManager({
  id: 'YOUR_ID' // id is only needed if you haven't configured globally
}) 

useScriptEventPage((title, path) => {
  // triggered on route change after title is updated
  proxy.dataLayer.push({ 
    event: 'pageview',
    title, 
    path 
  })
})
```

### GoogleTagManagerApi

```ts
interface GoogleTagManagerApi {
  dataLayer: Record<string, any>[]
  google_tag_manager: GoogleTagManager
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const GoogleTagManagerOptions = object({
  /**
   * The Google Tag Manager ID.
   */
  id: string(),
  /**
   * The script src.
   * @default 'https://www.googletagmanager.com/gtag/js'
   */
  src: optional(string()),
  /**
   * The name of the dataLayer you want to use
   * @default 'dataLayer'
   */
  dataLayerName: optional(string())
})
```

### Options types

```ts
type GoogleTagManagerInput = typeof GoogleTagManagerOptions & { onBeforeGtmStart?: ((gtag: Gtag) => void) => void }
```

## Example

Using Google Tag Manager only in production while using `dataLayer` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { dataLayer } = useScriptGoogleTagManager()

// noop in development, ssr
// just works in production, client
dataLayer.push({ event: 'conversion-step', value: 1 })
function sendConversion() {
  dataLayer.push({ event: 'conversion', value: 1 })
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

## Configuring GTM before it starts

`useScriptGoogleTagManager` initialize Google Tag Manager by itself. This means it pushes the `js`, `config` and the `gtm.start` events for you.

If you need to configure GTM before it starts. For example, (setting the consent mode)[https://developers.google.com/tag-platform/security/guides/consent?hl=fr&consentmode=basic]. You can use the `onBeforeGtmStart` hook which is run right before we push the `gtm.start` event into the dataLayer.
