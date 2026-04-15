---
title: Meta Pixel
description: Use Meta Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/meta-pixel.ts
  size: xs
---

[Meta Pixel](https://www.facebook.com/business/tools/meta-pixel) lets you measure, optimise and build audiences for your Facebook ad campaigns.

Nuxt Scripts provides a registry script composable [`useScriptMetaPixel()`{lang="ts"}](/scripts/meta-pixel){lang="ts"} to easily integrate Meta Pixel in your Nuxt app.

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

See [Meta's consent docs](https://www.facebook.com/business/help/1151321516677370) for details.
