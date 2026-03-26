---
title: Databuddy Analytics
description: Use Databuddy Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/databuddy-analytics.ts
    size: xs
---

[Databuddy](https://www.databuddy.cc/) is a privacy-first analytics platform focused on performance and minimal data collection.

::script-stats
::

::script-docs
::

### CDN / Self-hosted

By default the registry injects `https://cdn.databuddy.cc/databuddy.js`. If you host the script yourself, pass `scriptUrl` in options to override the `src`.

```ts
useScriptDatabuddyAnalytics({
  scriptUrl: 'https://my-host/databuddy.js',
  clientId: 'YOUR_CLIENT_ID'
})
```

::script-types
::
