---

title: X Pixel
description: Use X Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/x-pixel.ts
  size: xs

---

[X Pixel](https://x.com/) lets you collect, clean, and control your customer data. X helps you to understand your customers and personalize their experience.

Nuxt Scripts provides a registry script composable [`useScriptXPixel()`](/scripts/x-pixel){lang="ts"} to easily integrate X Pixel in your Nuxt app.

::script-docs
::

### XPixelApi

```ts
export interface XPixelApi {
  twq: TwqFns & {
    loaded: boolean
    version: string
    queue: any[]
  }
}
type TwqFns =
  ((event: 'event', eventId: string, data?: EventObjectProperties) => void)
  & ((event: 'config', id: string) => void)
  & ((event: string, ...params: any[]) => void)
interface ContentProperties {
  content_type?: string | null
  content_id?: string | number | null
  content_name?: string | null
  content_price?: string | number | null
  num_items?: string | number | null
  content_group_id?: string | number | null
}
interface EventObjectProperties {
  value?: string | number | null
  currency?: string | null
  conversion_id?: string | number | null
  email_address?: string | null
  phone_number?: string | null
  contents: ContentProperties[]
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const XPixelOptions = object({
  id: string(),
  version: optional(string()),
})
```
