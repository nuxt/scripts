---
title: Hotjar
description: Load Hotjar and queue events, user attributes, and virtual page views.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/hotjar.ts
  size: xs
---

[Hotjar](https://help.hotjar.com/hc/en-us/articles/36820019634961-What-is-Hotjar) combines session recordings, heatmaps, surveys, and user-feedback tools.

::script-stats
::

::script-docs
::

## Events and user attributes

Calls made through `proxy.hj` queue until the script is ready. Send an event when you want to filter recordings or heatmaps by a specific action:

```ts
const { proxy } = useScriptHotjar()

function recordSignup() {
  proxy.hj('event', 'signup_completed')
}
```

Hotjar's [Events API reference](https://help.hotjar.com/hc/en-us/articles/36819965075473-Events-API-Reference) lists the event-name restrictions and filtering limits. Events do not accept properties.

Use the Identify API for user attributes instead:

```ts
const { proxy } = useScriptHotjar()

proxy.hj('identify', user.id, {
  plan: user.plan,
})
```

Before sending attributes, review Hotjar's [Identify API privacy and data guidance](https://help.hotjar.com/hc/en-us/articles/36820006120721-Identify-API-Reference). Prefer a stable internal ID over an email address, and send only the fields you need.

::script-types
::
