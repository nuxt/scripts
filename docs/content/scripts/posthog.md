---
title: PostHog
description: Use PostHog in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/posthog.ts
  size: xs
---

[PostHog](https://posthog.com) is an open-source product analytics platform that provides analytics, session replay, feature flags, A/B testing, and more.

Nuxt Scripts provides a registry script composable [`useScriptPostHog()`{lang="ts"}](/scripts/posthog){lang="ts"} to easily integrate PostHog in your Nuxt app.

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

When [first-party mode](/docs/guides/first-party) is active (auto-enabled for scripts that support it), your server automatically proxies PostHog requests. This improves event capture reliability by avoiding ad blockers. Nuxt applies no privacy anonymization; PostHog is a trusted, open-source tool that requires full-fidelity data for GeoIP enrichment, feature flags, and session replay.

No additional configuration required. The module automatically sets `apiHost` to route through your server's proxy endpoint:

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

The proxy handles both API requests and static assets (e.g. session recording SDK), routing them to the correct PostHog endpoints.

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

PostHog exposes [`opt_in_capturing` / `opt_out_capturing`](https://posthog.com/docs/privacy/opting-out). Nuxt Scripts wires these to the `defaultConsent` option, applied BEFORE the first `capture()`{lang="ts"} call.

| Value | Behaviour |
|-------|-----------|
| `'opt-in'` | Calls `posthog.opt_in_capturing()`{lang="ts"} immediately after init. |
| `'opt-out'` | Calls `posthog.init(..., { opt_out_capturing_by_default: true })`{lang="ts"} so the SDK boots opted out. |

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

### Granting or revoking consent at runtime

```ts
const { proxy } = useScriptPostHog()

function onAccept() {
  proxy.posthog.opt_in_capturing()
}
function onRevoke() {
  proxy.posthog.opt_out_capturing()
}
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
