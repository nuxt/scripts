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

Set the key in `nuxt.config.ts` and call the composable without options. The default trigger waits until Nuxt is ready:

::code-group

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      measuremysiteAnalytics: { key: 'pk_...' },
    },
  },
})
```

```vue [app.vue]
<script setup lang="ts">
useScriptMeasuremysiteAnalytics()
</script>
```

::

You can also set the key with an environment variable:

```text [.env]
NUXT_PUBLIC_SCRIPTS_MEASUREMYSITE_ANALYTICS_KEY=pk_...
```

## Verifying the site

measuremy.site records nothing for a domain until it is verified. It verifies a domain by fetching its homepage and looking for the site key in the HTML.

The tracker loads on the client, so its script tag isn't in the server-rendered HTML. A key set in `nuxt.config.ts` or `.env` is still in that HTML, because Nuxt serializes public runtime config into the page. That is enough to verify. A key passed only to `useScriptMeasuremysiteAnalytics({ key })` ends up in a JavaScript chunk instead, so the homepage check can't find it.

If the key isn't in the homepage HTML, add the DNS TXT record from the measuremy.site Setup tab instead.
