---
title: MetricRaven
description: Load the MetricRaven tracker, record goals and identify users.
seoTitle: MetricRaven Setup for Nuxt
seoDescription: Add the MetricRaven tracking script to a Nuxt app, record goals, identify users and pass the visitor ID to your checkout from a typed composable.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/metricraven-analytics.ts
    size: xs
---

[MetricRaven](https://metricraven.com/) is web analytics that attributes revenue from your payment provider to the visit that brought each customer. It sets no cookies until you grant storage consent. The [install guide](https://metricraven.com/docs/install) lists the tracker's options.

::script-stats
::

::script-docs
::

## Proxying is not supported

Without storage consent, MetricRaven derives a daily visitor ID from the client IP. A proxy has to forward that IP in an `x-visitor-ip` header, which the Nuxt Scripts proxy does not do, so beacons sent through it would merge every visitor into one.

You can bundle the tracker on your Nuxt origin. Events still go to MetricRaven. The composable sets `data-api` and `data-addons` on the script tag, so the bundled copy keeps sending to the tracker's origin.

To serve everything from your own domain, use MetricRaven's [managed proxy](https://metricraven.com/docs/managed-proxy) and set `apiHost`, or a [server route](https://metricraven.com/docs/proxy-vue-nuxt) of your own and set `scriptUrl` and `endpoint`:

::code-group

```ts [Managed proxy]
useScriptMetricRavenAnalytics({
  siteId: 'ana_pub_…',
  apiHost: 'https://a.example.com',
})
```

```ts [Server route]
useScriptMetricRavenAnalytics({
  siteId: 'ana_pub_…',
  scriptUrl: '/a/script',
  endpoint: '/a/event',
})
```

::

## Goals

Use `proxy.track(name, props)`{lang="ts"} to record a goal. Calls made before the tracker loads run once it is ready. Properties can be strings, numbers or booleans.

::code-group

```ts [Proxy]
const { proxy } = useScriptMetricRavenAnalytics()
function trackSignup() {
  proxy.track('signup', { plan: 'pro' })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptMetricRavenAnalytics()
onLoaded(({ track }) => {
  track('newsletter_signup')
})
```

::

Elements with a `data-goal="name"` attribute are tracked on click without code. See [Goals & funnels](https://metricraven.com/docs/goals-funnels).

## Identify users

`identify` labels the current visitor with your user ID and traits. For a verified identity, pass a token your server signed, either with `identify({ token })`{lang="ts"} or the `identityToken` option. See [Identify users](https://metricraven.com/docs/identify-users).

```ts
const { proxy } = useScriptMetricRavenAnalytics()
proxy.identify(user.id, { name: user.name, email: user.email })
```

## Revenue attribution

To credit a payment to the visit, send the visitor ID to your checkout and on to your payment provider's metadata. See [Connect a payment provider](https://metricraven.com/docs/connect-payment-provider).

```ts
const { onLoaded } = useScriptMetricRavenAnalytics()
onLoaded(({ getVisitorId }) => {
  checkoutMetadata.metricraven_visitor_id = getVisitorId()
})
```

## Consent

Until storage consent is granted, the tracker stores nothing in the browser. Set `consent: true` when your banner's saved choice already allows it, or call `proxy.setConsent(true)`{lang="ts"} when the visitor accepts. See [Consent](https://metricraven.com/docs/consent).

## Page views in Nuxt

The tracker records client-side navigation without extra setup. Set `autoPageviews: false` to call `proxy.pageview(path)`{lang="ts"} yourself, and `hashRouting: true` for hash-mode routers.

::script-types
::

## Example

The default trigger waits until Nuxt is ready:

```vue [app.vue]
<script setup lang="ts">
useScriptMetricRavenAnalytics({
  siteId: 'ana_pub_…',
})
</script>
```
