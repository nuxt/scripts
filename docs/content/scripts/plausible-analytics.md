---
title: Plausible Analytics
description: Load Plausible's site-specific or legacy tracker, including custom self-hosted endpoints.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/plausible-analytics.ts
    size: xs
---

[Plausible Analytics](https://plausible.io/) is a privacy-focused web analytics platform. This registry entry supports both Plausible's current site-specific script and its legacy domain-based script.

::script-stats
::

::script-docs
::

### Self-hosted Plausible

If you use a self-hosted version of Plausible, provide both the script URL and the event endpoint. Changing the script URL alone does not change the endpoint passed to Plausible.

```ts
useScriptPlausibleAnalytics({
  endpoint: 'https://my-self-hosted-plausible.io/api/event',
  scriptInput: {
    src: 'https://my-self-hosted-plausible.io/js/script.js'
  }
})
```

For Plausible Cloud's current script, find the `scriptId` under **Site Installation** in your site settings. Plausible's [script update guide](https://plausible.io/docs/script-update-guide) explains the site-specific URL and the newer `plausible.init()`{lang="ts"} options.

::callout{color="amber"}
The current wrapper builds `plausible.init()`{lang="ts"} options but places its initialization hook inside `scriptOptions`, where `useRegistryScript` does not run it. With `scriptId`, options such as `customProperties`, `endpoint`, `fileDownloads`, `hashBasedRouting`, `autoCapturePageviews`, and `captureOnLocalhost` are therefore not applied; `trackForms` is not forwarded either. The legacy self-hosted example above still uses `data-api`, although development also logs a missing `scriptId`/`domain` warning for that valid custom-source setup.
::

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
