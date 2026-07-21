---
title: Databuddy Analytics
description: Load Databuddy's browser SDK and configure its analytics and performance tracking.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/databuddy-analytics.ts
    size: xs
---

[Databuddy](https://www.databuddy.cc/docs/getting-started) provides web analytics, error tracking, and performance measurements through a browser SDK.

::script-stats
::

::script-docs
::

## CDN or self-hosted

By default, the registry injects the [documented browser SDK](https://www.databuddy.cc/docs/sdk/vanilla-js) from `https://cdn.databuddy.cc/databuddy.js`. If you host the script yourself, pass `scriptUrl` to override the `src`.

```ts
useScriptDatabuddyAnalytics({
  scriptUrl: 'https://my-host/databuddy.js',
  clientId: 'YOUR_CLIENT_ID',
})
```

::callout{color="amber"}
First-party bundling rewrites the script URL, so the current integration also creates `window.databuddyConfig`. That fallback contains `clientId` plus truthy values for `apiUrl`, `disabled`, `trackScreenViews`, `trackPerformance`, and `trackSessions`. Other options remain only as `data-*` attributes, and explicit `false` values for those three tracking fields are not copied to the fallback config. Disable bundling if the bundled SDK does not apply the setting you need.
::

::script-types
::
