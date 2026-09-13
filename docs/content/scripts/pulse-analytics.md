---
title: Pulse Analytics
description: Load the Pulse tracker and record custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/pulse-analytics.ts
    size: xs
---

[Pulse](https://pulse.ciphera.net/) is cookie-free web analytics by [Ciphera](https://ciphera.net/). The tracker sets no cookies and stores no client-side identifier: Pulse identifies visitors server-side with rotating hashes. The [script reference](https://docs.ciphera.net/pulse/script-installation) documents every attribute the composable maps.

::script-stats
::

::script-docs
::

## Proxying is not supported

Pulse **cannot** be proxied (`proxy: true`).

Pulse derives visitor identity on the server from the connecting IP address and user agent. Beacons routed through your Nuxt server would all arrive from that server's IP, so every visitor would collapse into one identity per user agent. Pulse's [bot filtering](https://docs.ciphera.net/pulse/bot-filtering) also counts a datacenter or hosting-provider origin as one of its signals, which is where a proxied server sits. Because identity never reaches the browser, there is nothing for a first-party proxy to protect.

Bundling (`bundle: true`) **is** supported: the tracker is served from your origin, and the browser sends its beacons directly to the Pulse API.

## Self-hosted or proxied API

`apiUrl` sets the origin the tracker posts to (the `data-api` attribute). Leave it unset for the hosted Pulse API.

```ts
useScriptPulseAnalytics({
  domain: 'example.com',
  apiUrl: 'https://pulse-api.example.com',
})
```

## Defaults

- **Trigger: `onNuxtReady`** The script loads when the Nuxt app is ready.
- Pageviews, SPA route changes, scroll depth, outbound links and file downloads are recorded automatically. Set `trackScroll`, `trackOutbound` or `trackDownloads` to `false` to switch one off.
- Do Not Track and Global Privacy Control are honoured by the tracker itself.

Use the composable's `proxy` object for `track` calls. Calls made before the script has loaded are queued and sent once it has.

::code-group

```ts [Proxy]
const { proxy } = useScriptPulseAnalytics()
function trackSignup() {
  proxy.track('signup', { plan: 'pro' })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptPulseAnalytics()
onLoaded(({ track }) => {
  track('purchase', { product: 'annual_plan' }, 99)
})
```

::

Event names may contain letters, numbers and underscores. Property values must be strings, and the optional third argument is revenue. See the [custom events reference](https://docs.ciphera.net/pulse/custom-events).

::script-types
::

## Example

The default trigger waits until Nuxt is ready:

```vue [app.vue]
<script setup lang="ts">
useScriptPulseAnalytics({
  domain: 'example.com',
})
</script>
```
