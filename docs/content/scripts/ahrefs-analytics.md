---
title: Ahrefs Web Analytics
description: Track page views and custom events with Ahrefs Web Analytics in Nuxt.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/ahrefs-analytics.ts
    size: xs
---

[Ahrefs Web Analytics](https://help.ahrefs.com/en/articles/10247870-about-ahrefs-web-analytics) tracks page views and custom events without cookies or persistent identifiers. It discards the raw IP address after deriving coarse location data.

::script-stats
::

::script-docs
::

Default:

- **Trigger: `onNuxtReady`** The script loads when the Nuxt app is ready.

Use the proxy for void calls. Await `$script` when you need the loaded `AhrefsAnalytics` object. The [Ahrefs tracked events guide](https://help.ahrefs.com/en/articles/11381932-tracked-events-in-ahrefs-web-analytics) documents the JavaScript API and event-property shape.

::code-group

```ts [Proxy]
const { proxy } = useScriptAhrefsAnalytics({
  key: 'your-project-key',
})
function trackSignup() {
  proxy.AhrefsAnalytics.sendEvent('signup', {
    props: { plan: 'pro' },
  })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptAhrefsAnalytics({
  key: 'your-project-key',
})
onLoaded(({ AhrefsAnalytics }) => {
  AhrefsAnalytics.sendEvent('signup', {
    props: { plan: 'pro' },
  })
})
```

::

## SPA navigation

Ahrefs Analytics tracks single-page app navigations natively: the loaded [`analytics.js`](https://analytics.ahrefs.com/analytics.js) patches `history.pushState` and listens for `popstate`, firing a fresh page view whenever the URL changes. Nuxt route changes need no extra configuration.

::script-types
::
