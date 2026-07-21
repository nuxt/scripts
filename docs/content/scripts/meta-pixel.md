---
title: Meta Pixel
description: Load Meta Pixel, send events through fbq, and manage its binary consent state.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/meta-pixel.ts
  size: xs
---

[Meta Pixel](https://www.facebook.com/business/tools/meta-pixel) sends conversion and audience events to Meta Ads.

[`useScriptMetaPixel()`{lang="ts"}](/scripts/meta-pixel){lang="ts"} loads the pixel and exposes the `fbq` queue.

::script-stats
::

::script-docs
::

::script-types
::

## Consent Mode

Meta Pixel exposes a binary consent toggle. Set the initial state with `defaultConsent` (fires `fbq('consent', 'grant'|'revoke')`{lang="ts"} before `fbq('init', id)`{lang="ts"}) and call `consent.grant()`{lang="ts"} / `consent.revoke()`{lang="ts"} at runtime:

```vue
<script setup lang="ts">
const { consent } = useScriptMetaPixel({
  id: 'YOUR_PIXEL_ID',
  defaultConsent: 'denied',
})

function acceptAds() {
  consent.grant()
}
function rejectAds() {
  consent.revoke()
}
</script>
```

`defaultConsent: 'denied'` queues a revoke command before pixel initialization, but it does not delay the SDK request. If your consent policy requires no request to Meta before opt-in, use a [binary load gate](/docs/guides/consent#binary-load-gate) for the script itself.
