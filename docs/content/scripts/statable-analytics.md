---
title: Statable Analytics
description: Load the Statable tracker and record custom events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/statable-analytics.ts
    size: xs
---

[Statable](https://statable.com/) is privacy-first web analytics by Key Arg B.V., a Dutch company. The tracker sets no cookies and stores nothing on the visitor's device; the one thing it reads from `localStorage` is an opt-out flag. A visitor is counted on the server from a keyed one-way hash of the site, the address, the user agent and the date, and the raw inputs are not stored. Do Not Track and Global Privacy Control are honoured without configuration. The [script reference](https://statable.com/docs/developers/tracking-script/) lists every attribute this composable maps.

::script-stats
::

::script-docs
::

## Proxying is not supported

Statable derives visitor identity on its server from the connecting IP address and user agent. Beacons routed through your Nuxt server would all arrive from one address, so every visitor on the same browser would collapse into a single identity.

Nuxt Scripts therefore bundles the tracker and serves it from your origin, while its beacons go straight to the Statable API. The composable pins the site id and the API endpoint on the script tag, because the tracker would otherwise read both from the URL it was served from. There is no identifier in the browser for a first-party proxy to shield, so nothing is given up by leaving the beacons direct.

## Serving through your own domain

If you already proxy Statable through your own domain, `host` moves both the script and its beacons there. `trackingApi` overrides the endpoint on its own.

```ts
useScriptStatableAnalytics({
  siteId: 'YOUR_SITE_ID',
  host: 'https://stats.example.com',
})
```

## Custom events

The tracker exposes one function, `t(name, props)`. Use the composable's `proxy` object for it: a call made before the script has loaded is held and replayed once the tracker is in. Property values can be strings, numbers or booleans.

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

Outbound link clicks and file downloads are recorded on their own, and an element with a `data-statable-event` attribute fires on click or submit without any code. See the [JavaScript API](https://statable.com/docs/developers/javascript-api/).

## Sticky properties

`props` attaches custom properties to every event from the page load, which is handy for a cohort, an environment or an experiment tag. They render as `data-statable-*` attributes on the script tag.

```ts
useScriptStatableAnalytics({
  siteId: 'YOUR_SITE_ID',
  props: { env: 'production', cohort: 'beta' },
})
```

## Page views in a single-page app

The tracker hooks `pushState` and `replaceState` itself, so client-side navigation in Nuxt is counted as a page view without extra configuration. Engagement time and scroll depth for a page are sent when the visitor leaves it.

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
