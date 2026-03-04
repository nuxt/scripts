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

Nuxt Scripts provides a registry script composable [`useScriptTikTokPixel()`](/scripts/tiktok-pixel){lang="ts"} to easily integrate TikTok Pixel in your Nuxt app.

::script-stats
::

::script-docs
::

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
