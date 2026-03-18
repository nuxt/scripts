---

title: Matomo Analytics
description: Use Matomo Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/matomo-analytics.ts
    size: xs

---

[Matomo Analytics](https://matomo.org/) is a great analytics solution for Nuxt Apps.

It provides detailed insights into how your website is performing, how users are interacting with your content, and how they are navigating through your site.

::script-stats
::

::script-docs
::

::script-types
::

By default, Nuxt uses a `siteId` of `1` and automatically enables page tracking via the `watch` option.

```ts
useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
  siteId: 2,
  // watch: true, // enabled by default - automatic page tracking!
})
```

If you'd like more control over the tracking, for example to set a custom dimension, you can send events using the `proxy` object.

```ts
const { proxy } = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
})

// set custom dimension
proxy._paq.push(['setCustomDimension', 1, 'value'])
// send page event
proxy._paq.push(['trackPageView'])
```

Please see the [Config Schema](#config-schema) for all available options.

## Custom Page Tracking

By default, Nuxt tracks all pages automatically; provide `watch: false` to disable automatic tracking.

```ts
import { useScriptEventPage } from '#nuxt-scripts'

const { proxy } = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID',
  watch: false, // disable automatic tracking
})

// Custom page tracking with additional logic
useScriptEventPage((payload) => {
  // Set custom dimensions based on route
  if (payload.path.startsWith('/products')) {
    proxy._paq.push(['setCustomDimension', 1, 'Product Page'])
  }

  // Standard Matomo tracking calls (same as built-in watch behavior)
  proxy._paq.push(['setDocumentTitle', payload.title])
  proxy._paq.push(['setCustomUrl', payload.path])
  proxy._paq.push(['trackPageView'])

  // Track additional custom events
  proxy._paq.push(['trackEvent', 'Navigation', 'PageView', payload.path])
})
```

### Using Matomo Self-Hosted

For self-hosted Matomo, set `matomoUrl` to customize tracking, you may need to set the `trackerUrl` if you've customized this.

```ts
useScriptMatomoAnalytics({
  // e.g. https://your-url.com/tracker.js & https://your-url.com//matomo.php both exists
  matomoUrl: 'https://your-url.com',
})
```

### Using Matomo Whitelabel

For Matomo Whitelabel, set `trackerUrl` and `scriptInput.src` to customize tracking.

```ts
useScriptMatomoAnalytics({
  trackerUrl: 'https://c.staging.cookie3.co/lake',
  scriptInput: {
    src: 'https://cdn.cookie3.co/scripts/latest/cookie3.analytics.min.js',
  },
})
```
