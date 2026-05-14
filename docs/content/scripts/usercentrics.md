---
title: Usercentrics
description: Load the Usercentrics CMP v3 and drive useScript consent triggers from UC_UI_CMP_EVENT events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/usercentrics.ts
    size: xs
---

[Usercentrics](https://usercentrics.com) is a Consent Management Platform (CMP) used to collect, store, and signal end-user consent for third-party scripts under GDPR, CCPA, and the IAB TCF v2 framework.

Nuxt Scripts ships [`useScriptUsercentrics()`{lang="ts"}](/scripts/usercentrics) so you can boot the CMP v3 ("Web CMP") loader, expose typed access to the `window.__ucCmp` programmatic API, and wire other registry scripts' consent triggers directly to Usercentrics' `UC_UI_CMP_EVENT` browser event.

::script-stats
::

::script-docs
::

The composable comes with the following defaults:
- **Trigger: Client** Script will load when Nuxt is hydrating.
- **Bundle / proxy: off** The CMP is the consent surface itself, so it must hit the vendor origin directly. It is also exempt from consent gating.

You can access the `ucCmp` object as a proxy directly or await the `$script` promise. It's recommended to use the proxy for any void / Promise-returning calls.

::code-group

```ts [Proxy]
const { proxy } = useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
})
function showSettings() {
  proxy.ucCmp.showSecondLayer()
}
```

```ts [onLoaded]
const { onLoaded } = useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
})
onLoaded(({ ucCmp }) => {
  ucCmp.showFirstLayer()
})
```

::

## Drive consent triggers from Usercentrics

Pair `consent.onConsentChange(...)`{lang="ts"} with [`useScriptTriggerConsent`](/docs/api/use-script-trigger-consent) to load any third-party script the moment the user opts in via the Usercentrics banner.

```vue
<script setup lang="ts">
import { ref } from 'vue'

const { consent } = useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
})

const analyticsGranted = ref(false)

if (import.meta.client) {
  consent.onConsentChange(async (detail) => {
    if (detail.type === 'ACCEPT_ALL' || detail.type === 'SAVE') {
      const details = await window.__ucCmp!.getConsentDetails()
      analyticsGranted.value = !!details?.services?.['your-template-id']?.consent?.status
    }
    else if (detail.type === 'DENY_ALL') {
      analyticsGranted.value = false
    }
  })
}

useScriptGoogleAnalytics({
  id: 'G-XXXXXXX',
  scriptOptions: {
    trigger: useScriptTriggerConsent({ consent: analyticsGranted }),
  },
})
</script>

<template>
  <button @click="consent.showSecondLayer()">
    Privacy settings
  </button>
</template>
```

`onConsentChange` returns a teardown function so you can unsubscribe inside `onScopeDispose`. The callback receives the raw `UC_UI_CMP_EVENT` detail (e.g. `{ type: 'ACCEPT_ALL' | 'DENY_ALL' | 'SAVE', ... }`).

## Open the consent UI

`__ucCmp`'s methods are no-ops until the CMP API is ready. Use `consent.whenReady()`{lang="ts"} to await it, or call the helpers on `consent` directly (they no-op while the CMP boots):

```vue
<script setup lang="ts">
const { consent } = useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
})

async function logConsent() {
  const cmp = await consent.whenReady()
  console.log(await cmp.getConsentDetails())
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

## Auto Blocking

If your Usercentrics ruleset uses **Auto Blocking** (rather than Manual Blocking), set `autoblocker: true` to inject the autoblocker module ahead of the loader:

```ts
useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
  autoblocker: true,
})
```

::script-types
::

## Example

Loading Usercentrics through `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup lang="ts">
useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```

## Partytown

Do not run Usercentrics under Partytown. The `__ucCmp` API is method-heavy and unsafe to forward across the worker boundary, and the CMP needs main-thread DOM access to render its UI overlays.
