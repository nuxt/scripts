---
title: X Pixel
description: Send X Ads conversions with browser and server event deduplication.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/x-pixel.ts
  size: xs
---

[X Pixel](https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites) records website conversions and builds audiences for X Ads campaigns.

Use [`useScriptXPixel()`{lang="ts"}](/scripts/x-pixel){lang="ts"} to load the pixel and access its `twq` API.

::script-stats
::

::script-docs
::

## Browser and server event deduplication

When you send the same conversion from the browser and a server integration, give both events the same unique `conversion_id`. X uses that value to deduplicate the pair, as described in its [conversion-tracking guide](https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites):

```ts
const { proxy } = useScriptXPixel({ id: 'YOUR_PIXEL_ID' })

proxy.twq('event', 'YOUR_EVENT_ID', {
  conversion_id: order.id,
  value: order.total,
  currency: 'USD',
  contents: order.items.map(item => ({
    content_id: item.id,
    num_items: item.quantity,
  })),
})
```

The current Nuxt Scripts type requires `contents` for every event. X lists it as an event parameter rather than a universal requirement; only its Dynamic Product Ads instructions require it for all events. Include it for now or narrow through a local wrapper if your event has no item data.

::script-types
::
