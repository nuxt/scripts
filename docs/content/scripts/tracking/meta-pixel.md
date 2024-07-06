---
title: Meta Pixel
description: Use Meta Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/meta-pixel.ts
  size: xs
---

[Meta Pixel](https://www.facebook.com/business/tools/meta-pixel) lets you measure, optimise and build audiences for your Facebook ad campaigns.

Nuxt Scripts provides a registry script composable `useScriptMetaPixel` to easily integrate Meta Pixel in your Nuxt app.

### Nuxt Config Setup

The simplest way to load Meta Pixel globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptMetaPixel](#useScriptMetaPixel) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      metaPixel: {
        id: 'YOUR_ID'
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
        metaPixel: {
          id: 'YOUR_ID',
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
      metaPixel: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        metaPixel: {
          id: '', // NUXT_PUBLIC_SCRIPTS_META_PIXEL_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_META_PIXEL_ID=<YOUR_ID>
```

## useScriptMetaPixel

The `useScriptMetaPixel` composable lets you have fine-grain control over when and how Meta Pixel is loaded on your site.

```ts
const { fbq, $script } = useScriptMetaPixel({
  id: 'YOUR_ID'
})
// example
fbq('track', 'ViewContent', {
  content_name: 'Nuxt Pixel',
  content_category: 'Nuxt',
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### MetaPixelApi

```ts
export interface MetaPixelApi {
  fbq: FbqFns & {
    push: FbqFns
    loaded: boolean
    version: string
    queue: any[]
  }
  _fbq: MetaPixelApi['fbq']
}
type FbqFns = ((event: 'track', eventName: StandardEvents, data?: EventObjectProperties) => void)
  & ((event: 'trackCustom', eventName: string, data?: EventObjectProperties) => void)
  & ((event: 'init', id: number, data?: Record<string, any>) => void)
  & ((event: 'init', id: string) => void)
  & ((event: string, ...params: any[]) => void)
type StandardEvents = 'AddPaymentInfo' | 'AddToCart' | 'AddToWishlist' | 'CompleteRegistration' | 'Contact' | 'CustomizeProduct' | 'Donate' | 'FindLocation' | 'InitiateCheckout' | 'Lead' | 'Purchase' | 'Schedule' | 'Search' | 'StartTrial' | 'SubmitApplication' | 'Subscribe' | 'ViewContent'
interface EventObjectProperties {
  content_category?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  contents: { id: string, quantity: number }[]
  currency?: string
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery'
  num_items?: number
  predicted_ltv?: number
  search_string?: string
  status?: 'completed' | 'updated' | 'viewed' | 'added_to_cart' | 'removed_from_cart' | string
  value?: number
  [key: string]: any
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const MetaPixelOptions = object({
  id: number(),
  sv: optional(number()),
})
```

## Example

Using Meta Pixel only in production while using `fbq` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { fbq } = useScriptMetaPixel()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  fbq('trackCustom', 'conversion', {
    value: 1,
    currency: 'USD'
  })
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
      metaPixel: isDevelopment
        ? 'mock' // script won't load unless manually calling load()
        : {
            id: 'YOUR_ID',
          },
    },
  },
})
```

::
