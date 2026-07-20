---
title: Clarity
description: Load Microsoft Clarity and manage its session-recording consent state.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/clarity.ts
    size: xs
---

[Microsoft Clarity](https://learn.microsoft.com/en-us/clarity/setup-and-installation/about-clarity) records sessions and generates heatmaps for your site.

::script-stats
::

::script-docs
::

::script-types
::

## Consent mode

The `defaultConsent` option and `consent.set()`{lang="ts"} wrap Clarity's deprecated [Consent API V1](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v1). Microsoft documents that API with a boolean value (or no value to grant consent). Although the current Nuxt Scripts schema also accepts `Record<string, string>`{lang="html"}, Clarity does not document an object payload for V1.

```vue
<script setup lang="ts">
const { consent } = useScriptClarity({
  id: 'YOUR_PROJECT_ID',
  defaultConsent: false, // disable cookies until user opts in
})

function acceptAnalytics() {
  consent.set(true)
}
</script>
```

For new integrations, call Consent API V2 through the script proxy, using Clarity's case-sensitive category names:

```ts
const { proxy } = useScriptClarity({
  id: 'YOUR_PROJECT_ID',
})

proxy.clarity('consentv2', {
  ad_Storage: 'denied',
  analytics_Storage: 'denied',
})

// Update after the user grants consent.
proxy.clarity('consentv2', {
  ad_Storage: 'granted',
  analytics_Storage: 'granted',
})
```

`defaultConsent` and `consent.set()`{lang="ts"} do not issue `consentv2` commands. See [Clarity Consent API V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2) for the current API.
