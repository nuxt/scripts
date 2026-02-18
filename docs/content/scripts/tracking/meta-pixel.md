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
const { proxy } = useScriptMetaPixel({
  id: 'YOUR_ID'
})
// example
proxy.fbq('track', 'ViewContent', {
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
type FbqArgs =
  | ['track', StandardEvents, EventObjectProperties?]
  | ['trackCustom', string, EventObjectProperties?]
  | ['trackSingle', string, StandardEvents, EventObjectProperties?]
  | ['trackSingleCustom', string, string, EventObjectProperties?]
  | ['init', string]
  | ['init', number, Record<string, any>?]
  | ['consent', ConsentAction]
  | [string, ...any[]]
type FbqFns = (...args: FbqArgs) => void
type StandardEvents = 'AddPaymentInfo' | 'AddToCart' | 'AddToWishlist' | 'CompleteRegistration' | 'Contact' | 'CustomizeProduct' | 'Donate' | 'FindLocation' | 'InitiateCheckout' | 'Lead' | 'Purchase' | 'Schedule' | 'Search' | 'StartTrial' | 'SubmitApplication' | 'Subscribe' | 'ViewContent'
interface EventObjectProperties {
  content_category?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  contents?: { id: string, quantity: number }[]
  currency?: string
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery'
  num_items?: number
  predicted_ltv?: number
  search_string?: string
  status?: 'completed' | 'updated' | 'viewed' | 'added_to_cart' | 'removed_from_cart' | string
  value?: number
  [key: string]: any
}
type ConsentAction = 'grant' | 'revoke'
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const MetaPixelOptions = object({
  id: number(),
  sv: optional(number()),
})
```

## First-Party Mode

This script supports [First-Party Mode](/docs/guides/first-party) which routes all traffic through your domain for improved privacy and ad blocker bypass.

When enabled globally via `scripts.firstParty: true`, this script will:
- Load from your domain instead of `connect.facebook.net`
- Route tracking requests (`/tr`) through your server
- Anonymize user IP addresses to subnet level
- Generalize device fingerprinting data to common buckets

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      metaPixel: { id: '123456789' }
    }
  }
})
```

To opt-out for this specific script:

```ts
useScriptMetaPixel({
  id: '123456789',
  scriptOptions: {
    firstParty: false // Load directly from Meta
  }
})
```

## Example

Using Meta Pixel only in production while using `fbq` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptMetaPixel()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  proxy.fbq('trackCustom', 'conversion', {
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

::
