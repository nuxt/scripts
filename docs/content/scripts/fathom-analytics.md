---
title: Fathom Analytics
description: Load Fathom Analytics and track page views, goals, and custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/fathom-analytics.ts
    size: xs
---

[Fathom Analytics](https://usefathom.com/) tracks site traffic without collecting visitors' personal data.

::script-stats
::

::script-docs
::

## Proxying is not supported

Unlike most analytics integrations in Nuxt Scripts, Fathom **cannot** be proxied (`proxy: true`).

Fathom's bot detection uses the connecting source IP address. When beacons are proxied, they reach Fathom from your server's IP (typically a datacenter), and Fathom's bot detection ignores `X-Forwarded-For` from arbitrary servers, so every visitor gets flagged as a bot. This behavior and the resulting Nuxt Scripts change are documented in the [proxy-support fix](https://github.com/nuxt/scripts/pull/722).

Fathom [stopped offering custom domains in March 2023](https://usefathom.com/changelog/mar2023-firewall-settings). Existing custom domains continue to work, but new customers cannot configure one.

Bundling (`bundle: true`) **is** supported: the script is served from your origin, but beacons still go directly to `cdn.usefathom.com` from the browser so real client IPs reach Fathom's bot detection correctly.

## Defaults

- **Trigger: `onNuxtReady`** The script loads when the Nuxt app is ready.

Use the composable's `proxy` object for void calls. Use `onLoaded` when you need the loaded `fathom` object.

::code-group

```ts [Proxy]
const { proxy } = useScriptFathomAnalytics()
function trackMyGoal() {
  proxy.trackGoal('MY_GOAL_ID', 100)
}
```

```ts [onLoaded]
const { onLoaded } = useScriptFathomAnalytics()
onLoaded(({ trackGoal }) => {
  trackGoal('MY_GOAL_ID', 100)
})
```

::

::script-types
::

## Example

The default trigger waits until Nuxt is ready:

```vue [app.vue]
<script setup lang="ts">
useScriptFathomAnalytics({
  site: 'YOUR_SITE_ID',
})
</script>
```
