---
title: TikTok Pixel
description: Track TikTok conversions with consent, deduplication, and advanced matching.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/tiktok-pixel.ts
  size: xs
---

[TikTok Pixel](https://ads.tiktok.com/help/article/tiktok-pixel) reports browser events to TikTok Ads for conversion measurement and audiences.

Use [`useScriptTikTokPixel()`{lang="ts"}](/scripts/tiktok-pixel){lang="ts"} to load the pixel and access its `ttq` API.

::script-stats
::

::script-docs
::

## Disabling automatic page views

By default, TikTok Pixel tracks a page view during initialization. Disable it in the composable call:

```ts
useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
  trackPageView: false,
})
```

## Consent mode

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

See the [TikTok cookie consent docs](https://business-api.tiktok.com/portal/docs?id=1739585600931842) for the full behavior.

The initial consent command is queued before pixel initialization, but it does not delay the SDK request. If your policy requires no request to TikTok before opt-in, use a [consent trigger](/docs/guides/consent#binary-load-gate) for the script itself.

## Data-residency endpoint

Set `region: 'us'` to load the Pixel SDK from `analytics.us.tiktok.com` instead of the global host:

```ts
useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
  region: 'us',
})
```

This option selects the SDK host only. It does not by itself establish that the rest of your tracking setup meets a data-residency or privacy requirement.

## Server-side event deduplication

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

## Testing browser events

TikTok's [browser Pixel testing guide](https://ads.us.tiktok.com/help/article/test-tiktok-pixel-events-video-walkthrough?lang=en) uses the Test Events tab in Events Manager: enter the site URL, open it through the generated test flow, then perform the action you want to inspect.

The current Nuxt Scripts type also accepts `test_event_code` in a fourth `track` argument and forwards it to the SDK. TikTok documents that field for the server-side Events API, not for the browser `ttq.track` signature, so do not rely on it for browser testing.

## Advanced matching

Nuxt Scripts expects each identify field (`email`, `phone_number`, `external_id`, `first_name`, `last_name`, `city`, `state`, `country`, `zip_code`) as a 64-character SHA-256 hex digest. TikTok's [Advanced Matching guide](https://ads.tiktok.com/help/article/advanced-matching-web?lang=en) covers normalization and hashing. In development, the composable warns when a value does not look hashed.

```ts
async function sha256(value: string) {
  const input = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

const { proxy } = useScriptTikTokPixel({ id: 'YOUR_PIXEL_ID' })
proxy.ttq('identify', {
  email: await sha256('user@example.com'.trim().toLowerCase()),
  phone_number: await sha256('+15551234567'),
})
```

[`crypto.subtle.digest()`{lang="ts"}](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) is available only in a secure context in browsers. Localhost is treated as secure for development; deploy this example over HTTPS.

::script-types
::
