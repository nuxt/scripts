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
implement within your Nuxt app. If you're using GTM for Google Tag Manager, you can use the `useScriptGoogleAnalytics` composable instead.
::

### Nuxt Config Setup

The simplest way to load Google Tag Manager globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptGoogleTagManager](#useScriptGoogleTagManager) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: 'YOUR_ID'
        dataLayerName: 'defaultGtm'
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
          token: 'YOUR_TOKEN_ID',
          dataLayerName: 'defaultGtm'
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
      googleTagManager: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        googleTagManager: {
          id: '', // NUXT_PUBLIC_SCRIPTS_GOOGLE_TAG_MANAGER_ID
          dataLayerName: 'defaultGtm' // NUXT_PUBLIC_SCRIPTS_DATA_LAYER_NAME
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_GOOGLE_TAG_MANAGER_ID=<YOUR_ID>
```

## useScriptGoogleTagManager

The `useScriptGoogleTagManager` composable lets you have fine-grain control over when and how Google Tag Manager is loaded on your site.

```ts
const { dataLayer, $script } = useScriptGoogleTagManager({
  id: 'YOUR_ID'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

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
   * The name of the dataLayer you want to use
   * @default 'defaultGtm'
   */
  dataLayerName: string()
})
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

```ts [nuxt.config.ts Mock development]
import { isDevelopment } from 'std-env'

export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: isDevelopment
        ? 'mock' // script won't load unless manually calling load()
        : {
            id: 'YOUR_ID',
          },
    },
  },
})
```

::
