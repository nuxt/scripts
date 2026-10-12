---
title: measuremy.site
description: Load the measuremy.site tracker and record custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/measuremysite-analytics.ts
    size: xs
---

[measuremy.site](https://measuremy.site/) is cookieless web analytics. The tracker is under 1 KB gzipped and stores nothing in the browser. You can read the numbers from the dashboard, or from a coding agent through its [MCP server](https://measuremy.site/docs/mcp).

The `key` option is the site's public key (`pk_...`) from the Setup tab of the dashboard. It is safe to commit.

::script-stats
::

::script-docs
::

## Proxying is not supported

measuremy.site counts unique visitors from a daily salted hash of the connecting IP address and user agent. If your Nuxt server relays beacons, measuremy.site sees the server's IP instead.

You can bundle the tracker on your Nuxt origin. Beacons still go to `https://a.measuremy.site/collect`: the composable sets `data-api` on the script tag so a bundled copy keeps the endpoint.

## Custom events

Use `proxy.track(name, props)` to record an event. Calls made before the tracker loads run once it is ready. Properties can be strings, numbers or booleans.

::code-group

```ts [Proxy]
const { proxy } = useScriptMeasuremysiteAnalytics()
function trackSignup() {
  proxy.track('signup', { plan: 'pro' })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptMeasuremysiteAnalytics()
onLoaded(({ track }) => {
  track('purchase', { plan: 'annual', amount: 99 })
})
```

::

Clicks and form submits can also be tracked without JavaScript, with a `data-measuremysite-event` attribute on the element. See the [install guide](https://measuremy.site/docs/install).

## Page views in Nuxt

The tracker counts client-side navigation without extra setup.

::script-types
::

## Example

The default trigger waits until Nuxt is ready:

```vue [app.vue]
<script setup lang="ts">
useScriptMeasuremysiteAnalytics({
  key: 'pk_...',
})
</script>
```
