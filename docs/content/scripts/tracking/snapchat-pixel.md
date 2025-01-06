---
title: Snapchat Pixel
description: Use Snapchat Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/snapchat-pixel.ts
  size: xs
---

[Snapchat Pixel](https://businesshelp.snapchat.com/s/article/snap-pixel-about){:target="_blank"} lets you measure the crossdevice impact for your Snapchat ad campaigns.

Nuxt Scripts provides a registry script composable `useScriptSnapchatPixel` to easily integrate Snapchat Pixel in your Nuxt app.

### Nuxt Config Setup

The simplest way to load Snpachat Pixel globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptSnapchatPixel](#useScriptSnapchatPixel) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      snapchatPixel: {
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
        snapchatPixel: {
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
      snapchatPixel: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        snapchatPixel: {
          id: '', // NUXT_PUBLIC_SCRIPTS_SNAPCHAT_PIXEL_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_SNAPCHAT_PIXEL_ID=<YOUR_ID>
```

## useScriptSnapchatPixel

The `useScriptSnapchatPixel` composable lets you have fine-grain control over when and how Snapchat Pixel is loaded on your site.

```ts
const { proxy } = useScriptSnapchatPixel({
  id: 'YOUR_ID',
  user_email: 'USER_EMAIL'
})
// example
proxy.snaptr('track', 'PURCHASE', {
  currency: 'USD',
  price: 120.10,
  transaction_id: '11111'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### SnapchatPixelApi

```ts
export interface SnapPixelApi {
  snaptr: SnapTrFns & {
    push: SnapTrFns
    loaded: boolean
    version: string
    queue: any[]
  }
  _snaptr: SnapPixelApi['snaptr']
  handleRequest?: SnapTrFns
}
type StandardEvents = 'PAGE_VIEW' | 'VIEW_CONTENT' | 'ADD_CART' | 'SIGN_UP' | 'SAVE' | 'START_CHECKOUT' | 'APP_OPEN' | 'ADD_BILLING' | 'SEARCH' | 'SUBSCRIBE' | 'AD_CLICK' | 'AD_VIEW' | 'COMPLETE_TUTORIAL' | 'LEVEL_COMPLETE' | 'INVITE' | 'LOGIN' | 'SHARE' | 'RESERVE' | 'ACHIEVEMENT_UNLOCKED' | 'ADD_TO_WISHLIST' | 'SPENT_CREDITS' | 'RATE' | 'START_TRIAL' | 'LIST_VIEW'
type SnapTrFns =
  ((event: 'track', eventName: StandardEvents | '', data?: EventObjectProperties) => void) &
  ((event: 'init', id: string, data?: Record<string, any>) => void) &
  ((event: 'init', id: string, data?: InitObjectProperties) => void) &
  ((event: string, ...params: any[]) => void)
interface EventObjectProperties {
  price?: number
  client_dedup_id?: string
  currency?: string
  transaction_id?: string
  item_ids?: string[]
  item_category?: string
  description?: string
  search_string?: string
  number_items?: number
  payment_info_available?: 0 | 1
  sign_up_method?: string
  success?: 0 | 1
  brands?: string[]
  delivery_method?: 'in_store' | 'curbside' | 'delivery'
  customer_status?: 'new' | 'returning' | 'reactivated'
  event_tag?: string
  [key: string]: any
}
interface InitObjectProperties {
  user_email?: string
  ip_address?: string
  user_phone_number?: string
  user_hashed_email?: string
  user_hashed_phone_number?: string
  firstname?: string
  lastname?: string
  geo_city?: string
  geo_region?: string
  geo_postal_code?: string
  geo_country?: string
  age?: string
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const SnapTrPixelOptions = object({
  id: string(),
  trackPageView: optional(boolean()),
  user_email: optional(string()),
  ip_address: optional(string()),
  user_phone_number: optional(string()),
  user_hashed_email: optional(string()),
  user_hashed_phone_number: optional(string()),
  firstname: optional(string()),
  lastname: optional(string()),
  geo_city: optional(string()),
  geo_region: optional(string()),
  geo_postal_code: optional(string()),
  geo_country: optional(string()),
  age: optional(string()),
})
```

## Example

Using Snapchat Pixel only in production while using `snaptr` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptSnapchatPixel()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  proxy.snaptr('track', 'PURCHASE', {
    currency: 'USD',
    price: 120.10,
    transaction_id: '11111'
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
