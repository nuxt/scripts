---
title: Segment
description: Use Segment in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/segment.ts
  size: xs
---

[Segment](https://segment.com/) lets you collect, clean, and control your customer data. Segment helps you to understand your customers and personalize their experience.

Nuxt Scripts provides a registry script composable `useScriptSegment` to easily integrate Segment in your Nuxt app.

### Nuxt Config Setup

The simplest way to load Segment globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptSegment](#useScriptSegment) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      segment: {
        writeKey: 'YOUR_WRITE_KEY'
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
        segment: {
          writeKey: 'YOUR_WRITE_KEY'
        }
      }
    }
  }
})
```

::

#### With Environment Variables

If you prefer to configure your id using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      segment: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        segment: {
          writeKey: '' // NUXT_PUBLIC_SCRIPTS_SEGMENT_WRITE_KEY
        }
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_SEGMENT_WRITE_KEY=<YOUR_WRITE_KEY>
```

## useScriptSegment

The `useScriptSegment` composable lets you have fine-grain control over when and how Segment is loaded on your site.

```ts
const { proxy } = useScriptSegment({
  id: 'YOUR_ID'
})
// example
proxy.track('event', {
  foo: 'bar'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### SegmentApi

```ts
interface SegmentApi {
  track: (event: string, properties?: Record<string, any>) => void
  page: (name?: string, properties?: Record<string, any>) => void
  identify: (userId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
  group: (groupId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
  alias: (userId: string, previousId: string, options?: Record<string, any>) => void
  reset: () => void
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const SegmentOptions = object({
  writeKey: string(),
  analyticsKey: optional(string()),
})
```

## First-Party Mode

This script supports [First-Party Mode](/docs/guides/first-party) which routes all traffic through your domain for improved privacy and ad blocker bypass.

When enabled globally via `scripts.firstParty: true`, this script will:
- Load from your domain instead of `cdn.segment.com`
- Route API requests (`api.segment.io`) through your server
- No privacy anonymization applied — Segment is a trusted data pipeline that requires full fidelity for downstream destinations

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      segment: { writeKey: 'YOUR_WRITE_KEY' }
    }
  }
})
```

To opt-out for this specific script:

```ts
useScriptSegment({
  writeKey: 'YOUR_WRITE_KEY',
  scriptOptions: {
    firstParty: false // Load directly from Segment
  }
})
```

## Example

Using Segment only in production while using `analytics` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptSegment()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  proxy.track('conversion', {
    value: 1,
    currency: 'USD'
  })
}
</script>

<template>
  <div>
    <button @click="sendConversion">
      Send Conversion
    </button>
  </div>
</template>
```

::
