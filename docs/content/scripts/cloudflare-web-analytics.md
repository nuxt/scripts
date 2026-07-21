---
title: Cloudflare Web Analytics
description: Load Cloudflare Web Analytics during hydration with its built-in SPA measurement enabled.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/cloudflare-web-analytics.ts
    size: xs
---

[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/) reports traffic and Web Vitals. Its beacon [does not use cookies or local storage](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/#information-collected), and the company says the product does not collect or use visitors' personal data.

::script-stats
::

::script-docs
::

Default:

- **Trigger: Client** The script loads during Nuxt hydration to keep Web Vitals metrics accurate.

This registry fixes the trigger to `client`. A `scriptOptions.trigger` value passed by the caller is overwritten, so this integration cannot currently be deferred with a consent or element trigger.

::callout{type="warning"}
The current runtime always enables SPA tracking, even though [Cloudflare documents `spa: false`](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/#disable-spa-analytics) as the switch for disabling it. Passing `spa: false` to this registry currently has no effect.
::

## Loading in app.vue

Register the beacon in `app.vue`:

```vue [app.vue]
<script setup lang="ts">
useScriptCloudflareWebAnalytics({
  token: '12ee46bf598b45c2868bbc07a3073f58',
})
</script>
```

The analytics script creates a `window.__cfBeacon` object. Access it after the script loads:

```ts
const { onLoaded } = useScriptCloudflareWebAnalytics({
  token: '12ee46bf598b45c2868bbc07a3073f58',
})
onLoaded(({ __cfBeacon }) => {
  console.log(__cfBeacon)
})
```

::script-types
::
