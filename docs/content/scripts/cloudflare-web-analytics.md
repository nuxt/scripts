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

::script-docs
::

The composable comes with the following defaults:
- **Trigger: Client** Script will load when the Nuxt is hydrating to keep web vital metrics accurate.

### CloudflareWebAnalyticsInput

```ts
export const CloudflareWebAnalyticsOptions = object({
  /**
   * The Cloudflare Web Analytics token.
   */
  token: string([minLength(32)]),
  /**
   * Cloudflare Web Analytics enables measuring SPAs automatically by overriding the History API's pushState function
   * and listening to the onpopstate. Hash-based router is not supported.
   *
   * @default true
   */
  spa: optional(boolean()),
})
```

### CloudflareWebAnalyticsApi

```ts
export interface CloudflareWebAnalyticsApi {
  __cfBeacon: {
    load: 'single'
    spa: boolean
    token: string
  }
}
```

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
