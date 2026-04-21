---
title: Fathom Analytics
description: Use Fathom Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/fathom-analytics.ts
    size: xs
---

[Fathom Analytics](https://usefathom.com/) is a great privacy analytics solution for your Nuxt app. It doesn't gather personal data from your visitors, yet provides detailed insights into how visitors use your site.

::script-stats
::

::script-docs
::

## Proxying is not supported

Unlike most analytics integrations in Nuxt Scripts, Fathom **cannot** be proxied (`proxy: true`).

Fathom's bot detection uses the connecting source IP address. When beacons are proxied, they reach Fathom from your server's IP (typically a datacenter), and Fathom's bot detection ignores `X-Forwarded-For` from arbitrary servers, so every visitor gets flagged as a bot.

Fathom previously offered an official Custom Domain feature (CNAME to their infrastructure) for first-party hosting, but they [deprecated it in May 2023](https://usefathom.com/changelog/mar2023-firewall-settings) and there is no replacement.

Bundling (`bundle: true`) **is** supported: the script is served from your origin, but beacons still go directly to `cdn.usefathom.com` from the browser so real client IPs reach Fathom's bot detection correctly.

## Defaults

- **Trigger**: Script will load when Nuxt is hydrated.

You can access the `fathom` object as a proxy directly or await the `$script` promise to access the object. It's recommended
to use the proxy for any void functions.

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

Loading Fathom Analytics through the `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup lang="ts">
useScriptFathomAnalytics({
  site: 'YOUR_SITE_ID',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```
