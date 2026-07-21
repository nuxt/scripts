---
title: Usercentrics
description: Load the Usercentrics CMP v3 and drive useScript consent triggers from UC_UI_CMP_EVENT events.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/usercentrics.ts
    size: xs
---

[Usercentrics](https://usercentrics.com) is a Consent Management Platform (CMP) for recording consent choices and controlling third-party services.

[`useScriptUsercentrics()`{lang="ts"}](/scripts/usercentrics) loads the CMP v3 ("Web CMP") script, types the `window.__ucCmp` API, and exposes the `UC_UI_CMP_EVENT` changes needed to trigger other registry scripts.

::script-stats
::

::script-docs
::

The composable uses these defaults:

- **Trigger: `onNuxtReady`.** The script loads after Nuxt hydration, using the module-wide default.
- **Bundle and proxy: off.** The CMP loads directly from Usercentrics and is not consent-gated.

Access `ucCmp` through the proxy, or await `$script` when you need the loaded object.

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

`onConsentChange` returns a teardown function for use with `onScopeDispose`. Its callback receives the raw `UC_UI_CMP_EVENT` detail, such as `{ type: 'ACCEPT_ALL' | 'DENY_ALL' | 'SAVE', ... }`.

## Open the consent UI

Call `consent.whenReady()`{lang="ts"} before the CMP's `UC_CMP_API_READY` event when you need to await initialization. The current helper only listens for the next event; it does not detect a CMP that is already ready, so a later call can remain pending. The other `consent` helpers call `window.__ucCmp` when it is present and otherwise return without doing anything.

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

If your Usercentrics ruleset uses **Auto Blocking**, set `autoblocker: true` to inject the autoblocker module ahead of the loader:

```ts
useScriptUsercentrics({
  rulesetId: 'your-ruleset-id',
  autoblocker: true,
})
```

Usercentrics requires the autoblocker to run before other service scripts; see its [direct implementation guide](https://support.usercentrics.com/hc/en-us/articles/19446626144540-Direct-implementation-and-markup-guide). Because the composable adds this option when it runs on the client, verify the ordering in your rendered app before relying on it for consent enforcement.

::script-types
::

## Partytown

Do not run Usercentrics under Partytown. Its CMP renders DOM overlays and its `__ucCmp` methods are not configured for worker forwarding.
