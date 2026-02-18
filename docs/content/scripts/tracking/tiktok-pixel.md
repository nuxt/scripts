---
title: TikTok Pixel
description: Use TikTok Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/tiktok-pixel.ts
  size: xs
---

[TikTok Pixel](https://ads.tiktok.com/help/article/tiktok-pixel) lets you measure, optimize and build audiences for your TikTok ad campaigns.

Nuxt Scripts provides a registry script composable `useScriptTikTokPixel` to easily integrate TikTok Pixel in your Nuxt app.

### Nuxt Config Setup

The simplest way to load TikTok Pixel globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptTikTokPixel](#usescripttiktokpixel) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      tiktokPixel: {
        id: 'YOUR_PIXEL_ID'
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
        tiktokPixel: {
          id: 'YOUR_PIXEL_ID'
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
      tiktokPixel: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        tiktokPixel: {
          id: '', // NUXT_PUBLIC_SCRIPTS_TIKTOK_PIXEL_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_TIKTOK_PIXEL_ID=<YOUR_ID>
```

## useScriptTikTokPixel

The `useScriptTikTokPixel` composable lets you have fine-grain control over when and how TikTok Pixel is loaded on your site.

```ts
const { proxy } = useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID'
})

// Track an event
proxy.ttq('track', 'ViewContent', {
  content_id: '123',
  content_name: 'Product Name',
  value: 99.99,
  currency: 'USD'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### TikTokPixelApi

```ts
export interface TikTokPixelApi {
  ttq: TtqFns & {
    push: TtqFns
    loaded: boolean
    queue: any[]
  }
}

type TtqFns =
  & ((cmd: 'track', event: StandardEvents | string, properties?: EventProperties) => void)
  & ((cmd: 'page') => void)
  & ((cmd: 'identify', properties: IdentifyProperties) => void)
  & ((cmd: string, ...args: any[]) => void)

type StandardEvents =
  | 'ViewContent' | 'ClickButton' | 'Search' | 'AddToWishlist'
  | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'CompletePayment'
  | 'PlaceAnOrder' | 'Contact' | 'Download' | 'SubmitForm'
  | 'CompleteRegistration' | 'Subscribe'
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const TikTokPixelOptions = object({
  id: string(),
  trackPageView: optional(boolean()), // default: true
})
```

## First-Party Mode

This script supports [First-Party Mode](/docs/guides/first-party) which routes all traffic through your domain for improved privacy and ad blocker bypass.

When enabled globally via `scripts.firstParty: true`, this script will:
- Load from your domain instead of `analytics.tiktok.com`
- Route tracking requests through your server
- Anonymize user IP addresses to subnet level
- Generalize device fingerprinting data to common buckets

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      tiktokPixel: { id: 'YOUR_PIXEL_ID' }
    }
  }
})
```

To opt-out for this specific script:

```ts
useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
  scriptOptions: {
    firstParty: false // Load directly from TikTok
  }
})
```

## Example

Using TikTok Pixel to track a purchase event.

::code-group

```vue [PurchaseButton.vue]
<script setup lang="ts">
const { proxy } = useScriptTikTokPixel()

function trackPurchase() {
  proxy.ttq('track', 'CompletePayment', {
    content_id: 'product-123',
    content_name: 'Awesome Product',
    value: 49.99,
    currency: 'USD'
  })
}
</script>

<template>
  <button @click="trackPurchase">
    Complete Purchase
  </button>
</template>
```

::

## Identifying Users

You can identify users for advanced matching:

```ts
const { proxy } = useScriptTikTokPixel()

proxy.ttq('identify', {
  email: 'user@example.com',
  phone_number: '+1234567890'
})
```

## Disabling Auto Page View

By default, TikTok Pixel tracks page views automatically. To disable:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      tiktokPixel: {
        id: 'YOUR_PIXEL_ID',
        trackPageView: false
      }
    }
  }
})
```
