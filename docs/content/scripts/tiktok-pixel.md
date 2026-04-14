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

TikTok Pixel exposes a binary consent toggle. Use `defaultConsent` to set the state before init:

```ts
useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
  defaultConsent: 'denied', // 'granted' | 'denied'
})
```

To grant or revoke at runtime:

```vue
<script setup lang="ts">
const { proxy } = useScriptTikTokPixel()

function acceptAds() {
  proxy.ttq.grantConsent()
}

function rejectAds() {
  proxy.ttq.revokeConsent()
}
</script>
```

See the [TikTok cookie consent docs](https://business-api.tiktok.com/portal/docs?id=1739585600931842) for the full behaviour.

::script-types
::
