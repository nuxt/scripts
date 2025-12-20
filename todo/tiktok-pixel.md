# TikTok Pixel Implementation Plan

## Research Summary

**NPM Package**: No official TikTok npm package. Load directly from TikTok's CDN.

**Script URL**: `https://analytics.tiktok.com/i18n/pixel/events.js`

**Pattern**: Queue-based like Meta Pixel. Simplified from TikTok's full SDK snippet.

## Implementation

### 1. Registry Script (`src/runtime/registry/tiktok-pixel.ts`)

```ts
import { useRegistryScript } from '../utils'
import { object, string, optional, boolean } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

type StandardEvents =
  | 'ViewContent'
  | 'ClickButton'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'CompletePayment'
  | 'PlaceAnOrder'
  | 'Contact'
  | 'Download'
  | 'SubmitForm'
  | 'CompleteRegistration'
  | 'Subscribe'

interface EventProperties {
  content_id?: string
  content_type?: string
  content_name?: string
  contents?: Array<{ content_id: string, content_type?: string, content_name?: string, price?: number, quantity?: number }>
  currency?: string
  value?: number
  description?: string
  query?: string
  [key: string]: any
}

interface IdentifyProperties {
  email?: string
  phone_number?: string
  external_id?: string
}

type TtqFns =
  & ((cmd: 'track', event: StandardEvents | string, properties?: EventProperties) => void)
  & ((cmd: 'page') => void)
  & ((cmd: 'identify', properties: IdentifyProperties) => void)
  & ((cmd: string, ...args: any[]) => void)

export interface TikTokPixelApi {
  ttq: TtqFns & {
    push: TtqFns
    loaded: boolean
    queue: any[]
  }
}

declare global {
  interface Window extends TikTokPixelApi {}
}

export const TikTokPixelOptions = object({
  id: string(),
  trackPageView: optional(boolean()), // default true
})

export type TikTokPixelInput = RegistryScriptInput<typeof TikTokPixelOptions, true, false, false>

export function useScriptTikTokPixel<T extends TikTokPixelApi>(_options?: TikTokPixelInput) {
  return useRegistryScript<T, typeof TikTokPixelOptions>('tiktokPixel', options => ({
    scriptInput: {
      src: 'https://analytics.tiktok.com/i18n/pixel/events.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? TikTokPixelOptions : undefined,
    scriptOptions: {
      use() {
        return { ttq: window.ttq }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          const ttq: TikTokPixelApi['ttq'] = window.ttq = function (...params: any[]) {
            // @ts-expect-error untyped
            if (ttq.callMethod) {
              // @ts-expect-error untyped
              ttq.callMethod(...params)
            }
            else {
              ttq.queue.push(params)
            }
          } as any
          ttq.push = ttq
          ttq.loaded = true
          ttq.queue = []
          ttq('init', options?.id)
          if (options?.trackPageView !== false) {
            ttq('page')
          }
        },
  }), _options)
}
```

### 2. Types (`src/runtime/types.ts`)

```ts
import type { TikTokPixelInput } from './registry/tiktok-pixel'

// in ScriptRegistry interface
tiktokPixel?: TikTokPixelInput
```

### 3. Registry Entry (`src/registry.ts`)

```ts
{
  label: 'TikTok Pixel',
  src: 'https://analytics.tiktok.com/i18n/pixel/events.js',
  category: 'tracking',
  logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">...</svg>`,
  import: {
    name: 'useScriptTikTokPixel',
    from: await resolve('./runtime/registry/tiktok-pixel'),
  },
}
```

### 4. Documentation (`docs/content/scripts/tracking/tiktok-pixel.md`)

```md
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

::code-group

\`\`\`ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      tiktokPixel: {
        id: 'YOUR_PIXEL_ID'
      }
    }
  }
})
\`\`\`

\`\`\`ts [Production only]
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
\`\`\`

::

#### With Environment Variables

\`\`\`ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      tiktokPixel: true,
    }
  },
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
\`\`\`

## useScriptTikTokPixel

\`\`\`ts
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
\`\`\`

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### TikTokPixelApi

\`\`\`ts
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
\`\`\`

### Config Schema

\`\`\`ts
export const TikTokPixelOptions = object({
  id: string(),
  trackPageView: optional(boolean()), // default: true
})
\`\`\`

## Example

Using TikTok Pixel to track a purchase event.

::code-group

\`\`\`vue [PurchaseButton.vue]
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
\`\`\`

::

## Identifying Users

You can identify users for advanced matching:

\`\`\`ts
const { proxy } = useScriptTikTokPixel()

proxy.ttq('identify', {
  email: 'user@example.com',
  phone_number: '+1234567890'
})
\`\`\`

## Disabling Auto Page View

By default, TikTok Pixel tracks page views automatically. To disable:

\`\`\`ts
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
\`\`\`
```

### 5. Testing

E2E test:
- Page with TikTok Pixel loaded
- Verify `ttq.track()` queues properly

## Files to Create/Modify

- [ ] `src/runtime/registry/tiktok-pixel.ts` (new)
- [ ] `src/runtime/types.ts` (add import + ScriptRegistry)
- [ ] `src/registry.ts` (add entry)
- [ ] `docs/content/scripts/tracking/tiktok-pixel.md` (new)
