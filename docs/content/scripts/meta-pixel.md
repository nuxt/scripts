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

Meta Pixel exposes a binary consent toggle. Use `defaultConsent` to set the state before `fbq('init', id)`{lang="ts"}:

```ts
useScriptMetaPixel({
  id: 'YOUR_PIXEL_ID',
  defaultConsent: 'denied', // 'granted' | 'denied'
})
```

To grant or revoke at runtime:

```vue
<script setup lang="ts">
const { proxy } = useScriptMetaPixel()

function acceptAds() {
  proxy.fbq('consent', 'grant')
}

function rejectAds() {
  proxy.fbq('consent', 'revoke')
}
</script>
```

See [Meta's consent docs](https://www.facebook.com/business/help/1151321516677370) for details.
