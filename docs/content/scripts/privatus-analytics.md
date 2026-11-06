---
title: Privatus Analytics
description: Load the Privatus Analytics tracker and record custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/privatus-analytics.ts
    size: xs
---

[Privatus Analytics](https://privatusanalytics.com/) is cookieless web analytics. The tracker sets no cookies and keeps no visitor ID in the browser. The only thing it stores is a visitor's own opt-out choice. The [docs](https://privatusanalytics.com/docs) list every tracker option.

A free plan covers 10,000 events a month on up to 3 sites.

::script-stats
::

::script-docs
::

## Proxying is not supported

Privatus Analytics counts visitors from a daily salted hash of the connecting IP address and user agent. If your Nuxt server relays beacons, every visitor looks like your server.

You can bundle the tracker on your Nuxt origin. Beacons still go to the Privatus Analytics API. The composable always sets `data-api` on the script tag, so a bundled copy keeps posting to the right place.

## Modules

`modules` turns on extra tracker modules, such as outbound links and downloads (`auto`), Core Web Vitals (`vitals`) and click maps (`clicks`). Without it, the tracker loads its default module, `engage`, which records time on page and scroll depth. Modules load at runtime from `api`, so bundling only covers the main script.

```ts
useScriptPrivatusAnalytics({
  site: 'pa_YOURSITEID',
  modules: ['engage', 'auto', 'vitals'],
})
```

## Custom events

Use `proxy.track(name, props)`{lang="ts"} to record an event. Calls made before the tracker loads run once it is ready. Properties can be strings, numbers, booleans or string arrays. `revenue` and `currency` record revenue.

::code-group

```ts [Proxy]
const { proxy } = useScriptPrivatusAnalytics()
function trackSignup() {
  proxy.track('Signup', { plan: 'pro' })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptPrivatusAnalytics()
onLoaded(({ track }) => {
  track('Purchase', { revenue: 49, currency: 'USD' })
})
```

::

You can also tag an element with `data-privatus-event="Signup"` and the tracker records clicks on it, or submits for a form.

## Page views in Nuxt

The tracker counts client-side navigation through `history.pushState`, so Vue Router page views need no setup. To send page views yourself, set `manual: true` and call `proxy.pageview()`{lang="ts"}.

The tracker sends nothing on `localhost` or in automated browsers, so local development and browser tests do not record visits.

::script-types
::

## Example

The default trigger waits until Nuxt is ready:

```vue [app.vue]
<script setup lang="ts">
useScriptPrivatusAnalytics({
  site: 'pa_YOURSITEID',
})
</script>
```
