---
title: PostHog
description: Use PostHog in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/posthog.ts
  size: xs
---

[PostHog](https://posthog.com) is an open-source product analytics platform that provides analytics, session replay, feature flags, A/B testing, and more.

Nuxt Scripts provides a registry script composable `useScriptPostHog` to easily integrate PostHog in your Nuxt app.

## Installation

You must install the `posthog-js` dependency:

```bash
pnpm add posthog-js
```

### Nuxt Config Setup

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY'
      }
    }
  }
})
```

```ts [Production only]
export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        posthog: {
          apiKey: 'YOUR_API_KEY'
        }
      }
    }
  }
})
```

::

#### With Environment Variables

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: true,
    }
  },
  runtimeConfig: {
    public: {
      scripts: {
        posthog: {
          apiKey: '', // NUXT_PUBLIC_SCRIPTS_POSTHOG_API_KEY
        },
      },
    },
  },
})
```

## useScriptPostHog

```ts
const { proxy } = useScriptPostHog({
  apiKey: 'YOUR_API_KEY'
})

// Capture an event
proxy.posthog.capture('button_clicked', {
  button_name: 'signup'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### PostHogApi

```ts
import type { PostHog } from 'posthog-js'

export interface PostHogApi {
  posthog: PostHog
}
```

### Config Schema

```ts
export const PostHogOptions = object({
  apiKey: string(),
  region: optional(union([literal('us'), literal('eu')])),
  autocapture: optional(boolean()),
  capturePageview: optional(boolean()),
  capturePageleave: optional(boolean()),
  disableSessionRecording: optional(boolean()),
  config: optional(record(string(), any())), // Full PostHogConfig passthrough
})
```

## Example

Using PostHog to track a signup event.

::code-group

```vue [SignupForm.vue]
<script setup lang="ts">
const { proxy } = useScriptPostHog()

function onSignup(email: string) {
  proxy.posthog.identify(email, {
    email,
    signup_date: new Date().toISOString()
  })
  proxy.posthog.capture('user_signed_up')
}
</script>

<template>
  <form @submit.prevent="onSignup(email)">
    <input v-model="email" type="email" />
    <button type="submit">Sign Up</button>
  </form>
</template>
```

::

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
