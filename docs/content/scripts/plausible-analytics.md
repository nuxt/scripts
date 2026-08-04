---
title: Plausible Analytics
description: Load Plausible's site-specific tracker, including custom self-hosted endpoints.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/plausible-analytics.ts
    size: xs
---

[Plausible Analytics](https://plausible.io/) is a privacy-focused web analytics platform. This registry entry supports its current site-specific script.

::script-stats
::

::script-docs
::

### Self-hosted Plausible

If you use a self-hosted version of Plausible, provide both the script URL and the event endpoint. Changing the script URL alone does not change the endpoint passed to Plausible.

```ts
useScriptPlausibleAnalytics({
  scriptId: 'YOUR_SCRIPT_ID',
  endpoint: 'https://my-self-hosted-plausible.io/api/event',
  scriptInput: {
    src: 'https://my-self-hosted-plausible.io/js/script.js'
  }
})
```

For Plausible Cloud, find the `scriptId` under **Site Installation** in your site settings. Plausible's [script update guide](https://plausible.io/docs/script-update-guide) explains the site-specific URL and `plausible.init()`{lang="ts"} options.

### Extract a Script ID

A current Plausible installation tag looks like this:

```html
<script async src="https://plausible.io/js/pa-gYyxvZhkMzdzXBAtSeSNz.js"></script>
```

Your `scriptId` is the part after `pa-` and before `.js`:

```ts
scriptId: 'gYyxvZhkMzdzXBAtSeSNz'
//         ^^^^^^^^^^^^^^^^^^^^^^^
//         Extract from: pa-{scriptId}.js
```

::script-types
::
