---
title: Rybbit Analytics
description: Use Rybbit Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/rybbit-analytics.ts
    size: xs
---

[Rybbit Analytics](https://www.rybbit.io/) is a privacy-focused analytics solution for tracking user activity on your website without compromising your users' privacy.

::script-stats
::

::script-docs
::

### Self-hosted Rybbit Analytics

If you are using a self-hosted version of Rybbit Analytics, you can provide a custom script source:

```ts
useScriptRybbitAnalytics({
  analyticsHost: 'https://your-rybbit-instance.com',
  siteId: 'YOUR_SITE_ID'
})
```

::script-types
::
