---
title: Pulse Analytics
description: Load the Pulse tracker and record custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/pulse-analytics.ts
    size: xs
---

[Pulse](https://pulse.ciphera.net/) is cookie-free web analytics by [Ciphera](https://ciphera.net/). The tracker leaves nothing in the browser, no cookie and no stored identifier; Pulse works out who a visitor is on its own servers, from rotating hashes. The [script reference](https://docs.ciphera.net/pulse/script-installation) lists every attribute this composable maps.

::script-stats
::

::script-docs
::

## Proxying is not supported

Pulse **cannot** be proxied (`proxy: true`).

Pulse builds visitor identity on its server from the connecting IP address and user agent. Route the beacons through your Nuxt server and they all arrive from one IP, so every visitor on the same user agent collapses into a single identity. Its [bot filtering](https://docs.ciphera.net/pulse/bot-filtering) counts a datacenter or hosting-provider origin as a signal too, which is where a proxied server sits. The tracker keeps no identifier in the browser either, so a first-party proxy has nothing client-side to shield.

Bundling (`bundle: true`) **is** supported: the tracker is served from your origin, and the browser sends its beacons straight to the Pulse API.

## Self-hosted or proxied API

`apiUrl` sets the origin the tracker posts to (the `data-api` attribute). Leave it unset for the hosted Pulse API.

```ts
useScriptPulseAnalytics({
  domain: 'YOUR_DOMAIN',
  apiUrl: 'https://pulse-api.example.com',
})
```

## Defaults

- **Trigger: `onNuxtReady`** The script loads when the Nuxt app is ready.
- The tracker records pageviews, SPA route changes, scroll depth, outbound links and file downloads on its own. Set `trackScroll`, `trackOutbound` or `trackDownloads` to `false` to turn one off.
- The tracker honours Do Not Track and Global Privacy Control itself.

Use the composable's `proxy` object for `track` calls. Call it before the script has loaded and Nuxt Scripts holds the call, then replays it once the tracker is in. If the visitor has opted out, the tracker never runs and the queue is dropped.

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
  domain: 'YOUR_DOMAIN',
})
</script>
```
