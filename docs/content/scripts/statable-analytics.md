---
title: Statable Analytics
description: Load the Statable tracker and record custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/statable-analytics.ts
    size: xs
---

[Statable](https://statable.com/) is cookie-free web analytics. It honours Do Not Track and Global Privacy Control. The [tracking script reference](https://statable.com/docs/developers/tracking-script/) lists its options.

This integration needs Statable's standalone tracking script, available on paid plans. The Hobby plan uses a widget bundle and has no separate tracker.

::script-stats
::

::script-docs
::

## Proxying is not supported

Statable uses the connecting IP address and user agent to count visitors. If your Nuxt server relays beacons, Statable sees the server's IP instead.

You can bundle the tracker on your Nuxt origin. Beacons still go to the Statable API. The composable sets the Site ID and API endpoint on the script tag so bundling keeps both values.

## Custom host and API endpoint

`host` selects where Nuxt Scripts fetches the tracker and sets the default beacon endpoint. With bundling, browsers load the tracker from your Nuxt origin. If the custom host relays beacons, set `trackingApi` to the Statable API so Statable sees each visitor's IP.

```ts
useScriptStatableAnalytics({
  siteId: 'YOUR_SITE_ID',
  host: 'https://stats.example.com',
  trackingApi: 'https://statable.com/api/event',
})
```

## Custom events

Use `proxy.t(name, props)` to record an event. Calls made before the tracker loads run once it is ready. Properties can be strings, numbers or booleans.

::code-group

```ts [Proxy]
const { proxy } = useScriptStatableAnalytics()
function trackSignup() {
  proxy.t('Sign Up', { plan: 'pro' })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptStatableAnalytics()
onLoaded(({ t }) => {
  t('Purchase', { plan: 'annual', amount: 99 })
})
```

::

Statable can also track outbound links, downloads and elements with `data-statable-event`. Enable each module in Statable's Site settings. See the [JavaScript API](https://statable.com/docs/developers/javascript-api/).

## Sticky properties

`props` adds properties to every event. Nuxt Scripts renders them as `data-statable-*` attributes.

```ts
useScriptStatableAnalytics({
  siteId: 'YOUR_SITE_ID',
  props: { env: 'production', cohort: 'beta' },
})
```

## Page views in Nuxt

The tracker counts client-side navigation without extra setup. Enable Statable's engagement module to record time and scroll depth.

::script-types
::

## Example

The default trigger waits until Nuxt is ready:

```vue [app.vue]
<script setup lang="ts">
useScriptStatableAnalytics({
  siteId: 'YOUR_SITE_ID',
})
</script>
```
