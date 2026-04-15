---
title: Bing UET
description: Use Microsoft Advertising Universal Event Tracking in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/bing-uet.ts
  size: xs
---

[Microsoft Advertising UET](https://about.ads.microsoft.com/en-us/solutions/tools/universal-event-tracking) (Universal Event Tracking) lets you track conversions, build remarketing lists, and optimize your Microsoft Advertising campaigns.

Nuxt Scripts provides a registry script composable [`useScriptBingUet()`{lang="ts"}](/scripts/bing-uet) to easily integrate Bing UET in your Nuxt app.

::script-stats
::

::script-docs
::

::script-types
::

## Examples

### Tracking Conversions

```vue
<script setup lang="ts">
const { proxy } = useScriptBingUet()

function trackPurchase() {
  proxy.uetq.push({
    ec: 'purchase',
    ev: 49.99,
    gc: 'USD',
  })
}
</script>
```

### Custom Events

```vue
<script setup lang="ts">
const { proxy } = useScriptBingUet()

function trackSignup() {
  proxy.uetq.push({
    ec: 'sign_up',
    el: 'newsletter',
    ea: 'engagement',
  })
}
</script>
```

### Consent Mode

Bing UET supports [advanced consent mode](https://help.ads.microsoft.com/#apex/ads/en/60119/1-500). Only `ad_storage` is honoured; set the initial state with `defaultConsent` and update at runtime via `consent.update()`{lang="ts"}:

```vue
<script setup lang="ts">
const { consent } = useScriptBingUet({
  defaultConsent: { ad_storage: 'denied' },
})

function grantConsent() {
  consent.update({ ad_storage: 'granted' })
}
</script>
```

`onBeforeUetStart` remains available for any other pre-load setup.
