---
title: Usercentrics
description: Load the Usercentrics CMP and drive useScript consent triggers from UC_CONSENT events.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/usercentrics.ts
  size: xs
---

[Usercentrics](https://usercentrics.com) is a Consent Management Platform (CMP) used to collect, store, and signal end user consent for third-party scripts under GDPR, CCPA, and the IAB TCF v2 framework.

Nuxt Scripts ships [`useScriptUsercentrics()`{lang="ts"}](/scripts/usercentrics) so you can boot the CMP loader, expose typed access to the `UC_UI` global, and wire other registry scripts' consent triggers directly to Usercentrics' `UC_CONSENT` event.

::script-stats
::

::script-docs
::

## Setup

Provide your Usercentrics `settingsId` in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      usercentrics: {
        settingsId: 'YOUR_SETTINGS_ID',
      },
    },
  },
})
```

The composable is exempt from consent gating; it is the consent surface itself, so it must hit the Usercentrics origin directly. Bundling and proxying are intentionally disabled.

## Drive consent triggers from Usercentrics

This is the killer integration. Pair `useScriptUsercentrics({ ... }).consent.onConsentChange(...)`{lang="ts"} with [`useScriptTriggerConsent`](/docs/api/use-script-trigger-consent) to load any third-party script the moment the user opts in via the Usercentrics banner.

```vue
<script setup lang="ts">
import { ref } from 'vue'

// Usercentrics service template ID. Find this in your Usercentrics admin
// under "Data Processing Services". Replace with your real ID.
const GA_TEMPLATE_ID = 'BJz7qNsdj-7'

// Boot the CMP. Settings ID comes from nuxt.config.
const { consent } = useScriptUsercentrics()

// Reactive flag flipped by UC_CONSENT events.
const gaGranted = ref(false)

if (import.meta.client) {
  consent.onConsentChange(() => {
    const services = window.UC_UI?.getServicesBaseInfo?.() || []
    const ga = services.find(s => s.id === GA_TEMPLATE_ID)
    gaGranted.value = !!ga?.consent.status
  })
}

// Load Google Analytics only when Usercentrics reports a granted consent.
useScriptGoogleAnalytics({
  id: 'G-XXXXXXX',
  scriptOptions: {
    trigger: useScriptTriggerConsent({ consent: gaGranted }),
  },
})
</script>

<template>
  <button @click="consent.showSecondLayer()">
    Privacy settings
  </button>
</template>
```

`onConsentChange` returns a teardown function so you can unsubscribe inside `onScopeDispose`. The callback receives the raw event detail emitted on `window`.

## Open the consent UI

`UC_UI` is not on `window` until `UC_UI_INITIALIZED` fires. Use `consent.whenReady()`{lang="ts"} to await it, or call the helpers on `consent` directly (they no-op while the CMP boots):

```vue
<script setup lang="ts">
const { consent } = useScriptUsercentrics()

async function logServices() {
  const ui = await consent.whenReady()
  console.log(ui.getServicesBaseInfo())
}
</script>

<template>
  <button @click="consent.showFirstLayer()">
    Show banner
  </button>
  <button @click="consent.acceptAll()">
    Accept all
  </button>
  <button @click="consent.denyAll()">
    Reject all
  </button>
</template>
```

## TCF mode

For IAB TCF v2 deployments, set `embeddingType: 'tcf'` and (optionally) `tcfEnabled: true`. The composable forwards both as data attributes on the loader script tag.

```ts
useScriptUsercentrics({
  settingsId: 'YOUR_SETTINGS_ID',
  embeddingType: 'tcf',
  tcfEnabled: true,
})
```

## Loader version

The loader URL has a version segment (`/browser-ui/<version>/loader.js`). It defaults to `'latest'`; pin it for reproducible builds:

```ts
useScriptUsercentrics({
  settingsId: 'YOUR_SETTINGS_ID',
  version: '3.6.0',
})
```

## Partytown

Usercentrics is not supported under Partytown. The `UC_UI` API is method-heavy and not safe to forward across the worker boundary; the CMP also needs main-thread DOM access to render its UI overlays.

::script-types
::
