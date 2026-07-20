---
title: PostHog
description: Load posthog-js with first-party proxy support, feature flags, and opt-in or opt-out controls.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/posthog.ts
  size: xs
---

[PostHog](https://posthog.com) is an open-source product analytics platform with session replay, feature flags, and experiments. Nuxt Scripts loads PostHog's official [`posthog-js` browser SDK](https://posthog.com/docs/libraries/js) from [npm](https://www.npmjs.com/).

Use [`useScriptPostHog()`{lang="ts"}](/scripts/posthog){lang="ts"} to load the SDK and access the PostHog client.

::script-stats
::

::script-docs
::

## Installation

You must install the `posthog-js` dependency:

```bash
pnpm add posthog-js
```

## EU Hosting

To use PostHog's EU cloud:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY',
        region: 'eu'
      }
    }
  }
})
```

## First-Party Proxy

When [first-party mode](/docs/guides/first-party) is active (auto-enabled for scripts that support it), your server automatically proxies PostHog requests. PostHog [recommends a reverse proxy](https://posthog.com/docs/advanced/proxy) for more reliable event capture because ad blockers can reject requests to known analytics domains. Nuxt anonymizes the client IP address to subnet level; other data passes through so features such as session replay and feature flags continue to work.

The module sets `apiHost` to your server's proxy endpoint:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY',
        // apiHost is auto-set to '/_scripts/p/ph' (or '/_scripts/p/ph-eu' for EU region)
      }
    }
  }
})
```

The proxy handles API requests and static assets, including the session recording SDK.

## Custom API Host

To use a custom reverse proxy or self-hosted PostHog instance, set `apiHost` directly:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY',
        apiHost: '/my-proxy'
      }
    }
  }
})
```

The `apiHost` option accepts any URL or relative path, overriding both the `region` default and the first-party proxy auto-configuration. For additional PostHog SDK options like `ui_host`, use the `config` passthrough.

## Feature Flags

Feature flag methods return values, so you need to wait for PostHog to load first:

```ts
const { onLoaded } = useScriptPostHog()

onLoaded(({ posthog }) => {
  // Check a feature flag
  if (posthog.isFeatureEnabled('new-dashboard')) {
    // Show new dashboard
  }

  // Get flag payload
  const payload = posthog.getFeatureFlagPayload('experiment-config')
})
```

## Consent Mode

PostHog exposes [`opt_in_capturing` / `opt_out_capturing`](https://posthog.com/docs/libraries/js#opt-out-of-data-capture). Set the boot-time default with `defaultConsent` and call `consent.optIn()`{lang="ts"} / `consent.optOut()`{lang="ts"} at runtime.

### `defaultConsent`

| Value | Behavior |
|-------|-----------|
| `'opt-in'` | Calls `posthog.opt_in_capturing()`{lang="ts"} immediately after init. |
| `'opt-out'` | Calls `posthog.init(..., { opt_out_capturing_by_default: true })`{lang="ts"} so the SDK boots opted out. |

::callout{icon="i-heroicons-information-circle"}
Use `defaultConsent: 'opt-out'` when you need the SDK to boot opted out. The runtime `consent.optOut()`{lang="ts"} calls `opt_out_capturing()`{lang="ts"} **after** init, which is weaker than the boot-time flag; any events captured between init and the opt-out call are still sent.
::

### Example

```vue
<script setup lang="ts">
const { consent } = useScriptPostHog({
  apiKey: 'YOUR_API_KEY',
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

Configuring PostHog globally in `nuxt.config`:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY',
        defaultConsent: 'opt-out',
      }
    }
  }
})
```

## Disabling Session Recording

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY',
        disableSessionRecording: true
      }
    }
  }
})
```

::script-types
::
