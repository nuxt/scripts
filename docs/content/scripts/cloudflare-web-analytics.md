---
title: Cloudflare Web Analytics
description: Use Cloudflare Web Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/cloudflare-web-analytics.ts
    size: xs
---

[Cloudflare Web Analytics](https://developers.cloudflare.com/analytics/web-analytics/) with Nuxt is a great privacy analytics solution. It offers free, privacy-centric analytics for your website. It doesn't gather personal data from your visitors, yet provides detailed insights into your web pages' performance as experienced by your visitors.

::script-stats
::

::script-docs
::

The composable comes with the following defaults:
- **Trigger: Client** Script will load when the Nuxt is hydrating to keep web vital metrics accurate.

::script-types
::

## Loading in app.vue

Loading Cloudflare Web Analytics through the `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup lang="ts">
useScriptCloudflareWebAnalytics({
  token: '12ee46bf598b45c2868bbc07a3073f58',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```

The Cloudflare Web Analytics composable injects a `window.__cfBeacon` object into the global scope. If you need
to access this you can do by awaiting the script.

```ts
const { onLoaded } = useScriptCloudflareWebAnalytics()
onLoaded(({ cfBeacon }) => {
  console.log(cfBeacon)
})
```
