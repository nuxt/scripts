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

Nuxt Scripts provides a registry script composable [`useScriptSnapchatPixel()`](/scripts/snapchat-pixel){lang="ts"} to easily integrate Snapchat Pixel in your Nuxt app.

::script-stats
::

::script-docs
::

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
