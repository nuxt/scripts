# PostHog Implementation Plan

## Research Summary

**NPM Package**: Official `posthog-js` package. User installs it, we use it directly.

**Approach**: Peer dependency pattern - user installs `posthog-js`, we import and initialize it. No CDN script loading. Add to module externals.

**Key Decision**: Use `defaults: '2025-11-30'` by default (PostHog's recommended 2025 settings). Document this, users can customize.

## Implementation

### 1. Package.json Updates

```json
"peerDependencies": {
  "posthog-js": "^1.0.0"
},
"peerDependenciesMeta": {
  "posthog-js": {
    "optional": true
  }
}
```

### 2. Module Externals (`src/module.ts` or build config)

Add `posthog-js` to externals so it's not bundled:
```ts
externals: [
  // ... existing
  'posthog-js',
]
```

### 3. Registry Script (`src/runtime/registry/posthog.ts`)

```ts
import type { PostHog, PostHogConfig } from 'posthog-js'
import { useRegistryScript } from '../utils'
import { string, object, optional, boolean, union, literal } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const PostHogOptions = object({
  apiKey: string(),
  // Region determines api_host
  region: optional(union([literal('us'), literal('eu')])), // default 'us'
  // Common config options (camelCase, mapped internally)
  autocapture: optional(boolean()),
  capturePageview: optional(boolean()),
  capturePageleave: optional(boolean()),
  disableSessionRecording: optional(boolean()),
  // Full config passthrough (unvalidated, use PostHog's snake_case)
  config: optional(object({})),
})

export type PostHogInput = RegistryScriptInput<typeof PostHogOptions, false, true>

export interface PostHogApi {
  posthog: PostHog
}

declare global {
  interface Window {
    posthog?: PostHog
  }
}

let posthogInstance: PostHog | undefined

export function useScriptPostHog<T extends PostHogApi>(_options?: PostHogInput) {
  return useRegistryScript<T, typeof PostHogOptions>('posthog', options => {
    const region = options?.region || 'us'
    const apiHost = region === 'eu'
      ? 'https://eu.i.posthog.com'
      : 'https://us.i.posthog.com'

    return {
      scriptInput: {
        src: '', // No external script - using npm package
      },
      schema: import.meta.dev ? PostHogOptions : undefined,
      scriptOptions: {
        use() {
          return { posthog: posthogInstance! }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : async () => {
            const { default: posthog } = await import('posthog-js')

            // Build config
            const config: Partial<PostHogConfig> = {
              api_host: apiHost,
              defaults: '2025-11-30', // PostHog's 2025 recommended defaults
              ...options?.config as Partial<PostHogConfig>,
            }
            // Map camelCase options to snake_case
            if (typeof options?.autocapture === 'boolean') config.autocapture = options.autocapture
            if (typeof options?.capturePageview === 'boolean') config.capture_pageview = options.capturePageview
            if (typeof options?.capturePageleave === 'boolean') config.capture_pageleave = options.capturePageleave
            if (typeof options?.disableSessionRecording === 'boolean') config.disable_session_recording = options.disableSessionRecording

            posthogInstance = posthog.init(options?.apiKey!, config)
            window.posthog = posthogInstance
          },
    }
  }, _options)
}
```

### 4. Types (`src/runtime/types.ts`)

```ts
import type { PostHogInput } from './registry/posthog'

// in ScriptRegistry interface
posthog?: PostHogInput
```

### 5. Registry Entry (`src/registry.ts`)

```ts
{
  label: 'PostHog',
  category: 'analytics',
  src: false, // No external script
  scriptBundling: false,
  logo: `<svg>...</svg>`, // PostHog hedgehog logo
  import: {
    name: 'useScriptPostHog',
    from: await resolve('./runtime/registry/posthog'),
  },
}
```

### 6. Documentation (`docs/content/scripts/analytics/posthog.md`)

```md
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

\`\`\`bash
pnpm add posthog-js
\`\`\`

### Nuxt Config Setup

::code-group

\`\`\`ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      posthog: {
        apiKey: 'YOUR_API_KEY'
      }
    }
  }
})
\`\`\`

\`\`\`ts [Production only]
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
\`\`\`

::

#### With Environment Variables

\`\`\`ts [nuxt.config.ts]
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
\`\`\`

## useScriptPostHog

\`\`\`ts
const { proxy } = useScriptPostHog({
  apiKey: 'YOUR_API_KEY'
})

// Capture an event
proxy.posthog.capture('button_clicked', {
  button_name: 'signup'
})
\`\`\`

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### PostHogApi

\`\`\`ts
import type { PostHog } from 'posthog-js'

export interface PostHogApi {
  posthog: PostHog
}
\`\`\`

### Config Schema

\`\`\`ts
export const PostHogOptions = object({
  apiKey: string(),
  region: optional(union([literal('us'), literal('eu')])),
  autocapture: optional(boolean()),
  capturePageview: optional(boolean()),
  capturePageleave: optional(boolean()),
  disableSessionRecording: optional(boolean()),
  config: optional(object({})), // Full PostHogConfig passthrough
})
\`\`\`

::callout
Nuxt Scripts sets `defaults: '2025-11-30'` by default for PostHog's recommended 2025 configuration. You can override this via the `config` option.
::

## Example

Using PostHog to track a signup event.

::code-group

\`\`\`vue [SignupForm.vue]
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
\`\`\`

::

## EU Hosting

To use PostHog's EU cloud:

\`\`\`ts
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
\`\`\`

## Feature Flags

\`\`\`ts
const { proxy } = useScriptPostHog()

// Check a feature flag
if (proxy.posthog.isFeatureEnabled('new-dashboard')) {
  // Show new dashboard
}

// Get flag payload
const payload = proxy.posthog.getFeatureFlagPayload('experiment-config')
\`\`\`

## Disabling Session Recording

\`\`\`ts
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
\`\`\`
```

### 7. Testing

E2E test:
- Page with PostHog loaded
- Verify `posthog.capture()` works
- Verify init called with correct config

## Files to Create/Modify

- [ ] `package.json` (add posthog-js peer dep + peerDependenciesMeta)
- [ ] `src/module.ts` or build config (add posthog-js to externals)
- [ ] `src/runtime/registry/posthog.ts` (new)
- [ ] `src/runtime/types.ts` (add import + ScriptRegistry)
- [ ] `src/registry.ts` (add entry with src: false)
- [ ] `docs/content/scripts/analytics/posthog.md` (new)

## Notes

- No CDN script - uses `import('posthog-js')` dynamically on client
- `posthog-js` must be installed by user as peer dependency
- Added to externals so Nuxt doesn't bundle it
- `src: false` in registry indicates no external script URL
- Types come directly from `posthog-js` package
