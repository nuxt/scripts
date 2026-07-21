---
title: Rybbit Analytics
description: Load hosted or self-hosted Rybbit Analytics and call its tracking API.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/rybbit-analytics.ts
    size: xs
---

[Rybbit Analytics](https://rybbit.com/) is an open-source web analytics platform. Its [tracking script documentation](https://rybbit.com/docs/script) covers the hosted and self-hosted script URLs.

::script-stats
::

::script-docs
::

### Self-hosted Rybbit Analytics

Rybbit's official self-hosted snippet replaces `app.rybbit.io` in `/api/script.js`. The current composable appends `/script.js` to `analyticsHost`, so include `/api` in the value:

```ts
useScriptRybbitAnalytics({
  analyticsHost: 'https://your-rybbit-instance.com/api',
  siteId: 'YOUR_SITE_ID'
})
```

Passing only the origin currently requests `https://your-rybbit-instance.com/script.js`, which differs from Rybbit's documented path.

::callout{color="amber"}
Rybbit now configures automatic page views, SPA navigation, outbound links, errors, session replay, and Web Vitals in the site dashboard. The current wrapper still emits older `data-*` attributes for those fields, which the current tracker documentation does not list. It also omits `data-debounce` when `debounce` is `0`, even though Rybbit documents zero as the way to disable debouncing.
::

::script-types
::
