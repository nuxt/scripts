---
title: TikTok Pixel
description: Use TikTok Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/tiktok-pixel.ts
  size: xs
---

[TikTok Pixel](https://ads.tiktok.com/help/article/tiktok-pixel) lets you measure, optimize and build audiences for your TikTok ad campaigns.

Nuxt Scripts provides a registry script composable [`useScriptTikTokPixel()`{lang="ts"}](/scripts/tiktok-pixel){lang="ts"} to easily integrate TikTok Pixel in your Nuxt app.

::script-stats
::

::script-docs
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

## Consent Mode

TikTok Pixel exposes a three-state consent API: grant, revoke, or hold (defer the decision). Set the initial state with `defaultConsent` and call `consent.grant()`{lang="ts"} / `consent.revoke()`{lang="ts"} / `consent.hold()`{lang="ts"} at runtime:

```vue
<script setup lang="ts">
const { consent } = useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
  defaultConsent: 'hold', // 'granted' | 'denied' | 'hold'
})

function acceptAds() {
  consent.grant()
}
function rejectAds() {
  consent.revoke()
}
</script>
```

See the [TikTok cookie consent docs](https://business-api.tiktok.com/portal/docs?id=1739585600931842) for the full behaviour.

## Data Residency Region

Enterprises with US data-residency requirements can route the Pixel SDK through `analytics.us.tiktok.com` by setting `region: 'us'` (default `'global'`):

```ts
useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
  region: 'us',
})
```

## Server-Side Event Deduplication

For the Pixel + Events API (CAPI) pattern, pass the same `event_id` on both the browser and server sides so TikTok deduplicates the pair:

```vue
<script setup lang="ts">
const { proxy } = useScriptTikTokPixel({ id: 'YOUR_PIXEL_ID' })

async function checkout(order: { id: string, total: number }) {
  const eventId = crypto.randomUUID()

  proxy.ttq('track', 'Purchase', { value: order.total, currency: 'USD', order_id: order.id }, { event_id: eventId })

  await $fetch('/api/tiktok/event', {
    method: 'POST',
    body: { event: 'Purchase', event_id: eventId, order_id: order.id, value: order.total },
  })
}
</script>
```

See [TikTok's event-deduplication guide](https://ads.tiktok.com/help/article/event-deduplication?lang=en) for full rules.

## Test Events Sandbox

Set `test_event_code` on the 4th `track` argument to route an event into TikTok's Test Events panel without affecting production reporting:

```ts
proxy.ttq('track', 'Purchase', { value: 99 }, { test_event_code: 'TEST12345' })
```

## Advanced Matching

TikTok requires identify fields (`email`, `phone_number`, `external_id`, `first_name`, `last_name`, `city`, `state`, `country`, `zip_code`) to be SHA-256-hashed lowercase. Raw values are silently ignored by TikTok; in development, Nuxt Scripts logs a warning when an unhashed value is detected:

```ts
import { sha256 } from 'ohash'

const { proxy } = useScriptTikTokPixel({ id: 'YOUR_PIXEL_ID' })
proxy.ttq('identify', {
  email: sha256('user@example.com'.trim().toLowerCase()),
  phone_number: sha256('+15551234567'),
})
```

::script-types
::
