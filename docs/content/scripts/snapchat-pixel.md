---
title: Snapchat Pixel
description: Load Snapchat Pixel and opt in to automatic or manual page-view events.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/snapchat-pixel.ts
  size: xs
---

[Snapchat Pixel](https://businesshelp.snapchat.com/s/article/snap-pixel-about){:target="_blank"} reports browser events to Snapchat Ads for conversion measurement.

Use [`useScriptSnapchatPixel()`{lang="ts"}](/scripts/snapchat-pixel){lang="ts"} to load the pixel and access its `snaptr` API.

::script-stats
::

::script-docs
::

## Page views

This integration does not send `PAGE_VIEW` by default. Enable the initialization event explicitly. Snapchat's [official Page View snippet](https://businesshelp.snapchat.com/articles/en_US/Knowledge/pixel-bigcommerce) uses the same `snaptr('track', 'PAGE_VIEW')`{lang="ts"} command:

```ts
const { proxy } = useScriptSnapchatPixel({
  id: 'YOUR_PIXEL_ID',
  trackPageView: true,
})

// Send later page views when your tracking policy requires them.
proxy.snaptr('track', 'PAGE_VIEW')
```

::script-types
::
