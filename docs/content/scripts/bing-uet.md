---
title: Bing UET
description: Use Microsoft Advertising Universal Event Tracking in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/bing-uet.ts
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
  proxy.uetq.push('event', 'purchase', {
    revenue_value: 49.99,
    currency: 'USD',
  })
}
</script>
```

### Custom Events

```vue
<script setup lang="ts">
const { proxy } = useScriptBingUet()

function trackSignup() {
  proxy.uetq.push('event', 'sign_up', {
    event_category: 'engagement',
    event_label: 'newsletter',
  })
}
</script>
```
