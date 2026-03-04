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

Nuxt Scripts provides a registry script composable [`useScriptMetaPixel()`](/scripts/meta-pixel){lang="ts"} to easily integrate Meta Pixel in your Nuxt app.

::script-stats
::

::script-docs
::

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
