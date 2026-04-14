---
title: Clarity
description: Use Clarity in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/clarity.ts
  size: xs
---

[Clarity](https://clarity.microsoft.com/) by Microsoft is a screen recorder and heatmap tool that helps you understand how users interact with your website.

::script-stats
::

::script-docs
::

::script-types
::

## Consent Mode

Clarity supports a cookie consent toggle (boolean) or an advanced consent vector (record). Use `defaultConsent` to set the state before Clarity starts:

```ts
useScriptClarity({
  id: 'YOUR_PROJECT_ID',
  defaultConsent: false, // disable cookies until user opts in
})

// or advanced vector
useScriptClarity({
  id: 'YOUR_PROJECT_ID',
  defaultConsent: {
    ad_storage: 'denied',
    analytics_storage: 'granted',
  },
})
```

To update consent at runtime:

```vue
<script setup lang="ts">
const { proxy } = useScriptClarity()

function acceptAnalytics() {
  proxy.clarity('consent', true)
}
</script>
```

See [Clarity cookie consent](https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-consent) for details.
