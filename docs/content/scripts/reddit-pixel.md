---

title: Reddit Pixel
description: Use Reddit Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/reddit-pixel.ts
  size: xs

---

[Reddit Pixel](https://advertising.reddithelp.com/en/categories/custom-audiences-and-conversion-tracking/reddit-pixel) helps you track conversions and build audiences for your Reddit advertising campaigns.

Nuxt Scripts provides a registry script composable [`useScriptRedditPixel()`](/scripts/reddit-pixel){lang="ts"} to easily integrate Reddit Pixel in your Nuxt app.

::script-docs
::

### RedditPixelApi

```ts
export interface RedditPixelApi {
  rdt: RdtFns & {
    sendEvent: (rdt: RedditPixelApi['rdt'], args: unknown[]) => void
    callQueue: unknown[]
  }
}
type RdtFns
  = & ((event: 'init', id: string) => void)
    & ((event: 'track', eventName: string) => void)
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const RedditPixelOptions = object({
  id: string(),
})
```
