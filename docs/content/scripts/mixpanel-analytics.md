---
title: Mixpanel
description: Load Mixpanel and track product events, identities, profiles, and consent.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/mixpanel-analytics.ts
  size: xs
---

[Mixpanel](https://mixpanel.com) analyzes product events through funnels and retention reports.

[`useScriptMixpanelAnalytics()`{lang="ts"}](/scripts/mixpanel-analytics) initializes the SDK and exposes the `mixpanel` API.

::script-stats
::

::script-docs
::

::script-types
::

## Examples

### Tracking Events

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

function trackSignup() {
  proxy.mixpanel.track('Sign Up', {
    plan: 'premium',
    source: 'landing_page',
  })
}
</script>
```

### Identifying Users

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

function login(userId: string) {
  proxy.mixpanel.identify(userId)
  proxy.mixpanel.people.set({
    $name: 'Jane Doe',
    $email: 'jane@example.com',
    plan: 'premium',
  })
}
</script>
```

### Registering Super Properties

Mixpanel [adds registered super properties](https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript#setting-super-properties) to subsequent events:

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

proxy.mixpanel.register({
  app_version: '2.0.0',
  platform: 'web',
})
</script>
```

### Resetting identity on logout

Call `reset()`{lang="ts"} when an identified user signs out or their session expires. Mixpanel [recommends resetting at logout](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users-simplified#client-side-identity-management) so two people sharing a device are not merged into the same identity:

```ts
const { proxy } = useScriptMixpanelAnalytics()

function logout() {
  // End your app session first.
  proxy.mixpanel.reset()
}
```

## Consent Mode

Mixpanel exposes [`opt_in_tracking` / `opt_out_tracking`](https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript#opt-out-of-tracking). Set the boot-time default with `defaultConsent` and call `consent.optIn()`{lang="ts"} / `consent.optOut()`{lang="ts"} at runtime.

### `defaultConsent`

| Value | Behavior |
|-------|-----------|
| `'opt-in'` | Starts opted in. |
| `'opt-out'` | Calls `mixpanel.init(..., { opt_out_tracking_by_default: true })`{lang="ts"} so the SDK boots opted out. |

::callout{icon="i-heroicons-information-circle"}
`defaultConsent: 'opt-out'` applies before the first event. Calling `consent.optOut()`{lang="ts"} later cannot retract events already captured by the SDK.
::

### Example

```vue
<script setup lang="ts">
const { consent } = useScriptMixpanelAnalytics({
  token: 'YOUR_TOKEN',
  defaultConsent: 'opt-out',
})

function onAccept() {
  consent.optIn()
}
function onRevoke() {
  consent.optOut()
}
</script>
```
