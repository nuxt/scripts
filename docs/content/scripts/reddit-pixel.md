---
title: Reddit Pixel
description: Load Reddit Pixel and send page visits or conversion events through its typed API.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/reddit-pixel.ts
  size: xs
---

[Reddit Pixel](https://business.reddithelp.com/s/article/reddit-pixel) helps you track conversions and build audiences for your Reddit advertising campaigns.

Use [`useScriptRedditPixel()`{lang="ts"}](/scripts/reddit-pixel){lang="ts"} to load Reddit Pixel and access its `rdt` API.

::script-stats
::

::script-docs
::

## Initial page visit

The client initializer queues `rdt('track', 'PageVisit')`{lang="ts"} once after it queues `init`. It does not send another page visit on Nuxt route changes. Add your own route tracking if each client-side navigation should count as a [`PageVisit`](https://business.reddithelp.com/articles/Knowledge/supported-conversion-events).

::script-types
::
