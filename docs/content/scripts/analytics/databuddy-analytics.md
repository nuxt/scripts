---
title: Databuddy Analytics
description: Use Databuddy Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/databuddy-analytics.ts
    size: xs
---

[Databuddy](https://www.databuddy.cc/) is a privacy-first analytics platform focused on performance and minimal data collection.

Use the registry to easily inject the Databuddy CDN script with sensible defaults, or call the composable for fine-grain control.

## Loading Globally

The simplest way to enable Databuddy globally is via `nuxt.config` (or module config). You can use environment overrides to only enable in production.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      databuddyAnalytics: {
        clientId: 'YOUR_CLIENT_ID'
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
        databuddyAnalytics: {
          clientId: 'YOUR_CLIENT_ID'
        }
      }
    }
  }
})
```

```ts [Environment Variables]
export default defineNuxtConfig({
  scripts: {
    registry: {
      databuddyAnalytics: true,
    }
  },
  runtimeConfig: {
    public: {
      scripts: {
        databuddyAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_DATABUDDY_ANALYTICS_CLIENT_ID=<your-client-id>
          clientId: ''
        },
      },
    },
  },
})
```

::

## useScriptDatabuddyAnalytics

The `useScriptDatabuddyAnalytics` composable gives you control over when and how Databuddy is loaded.

```ts
const db = useScriptDatabuddyAnalytics({
  clientId: 'YOUR_CLIENT_ID',
  trackWebVitals: true,
  trackErrors: true,
  enableBatching: true,
})
```

The composable returns the script proxy (when available). You can interact with the global API via `db` or `window.db` / `window.databuddy`.

### CDN / Self-hosted

By default the registry injects `https://cdn.databuddy.cc/databuddy.js`. If you host the script yourself, pass `scriptUrl` in options to override the `src`.

```ts
useScriptDatabuddyAnalytics({
  scriptInput: { src: 'https://my-host/databuddy.js' },
  clientId: 'YOUR_CLIENT_ID'
})
```

### DatabuddyAnalyticsApi

```ts
export interface DatabuddyAnalyticsApi {
  track: (eventName: string, properties?: Record<string, any>) => Promise<any> | any | void
  screenView: (path?: string, properties?: Record<string, any>) => void
  setGlobalProperties: (properties: Record<string, any>) => void
  trackCustomEvent: (eventName: string, properties?: Record<string, any>) => void
  clear: () => void
  flush: () => void
}
```

### Config Schema

You must provide a `clientId` when configuring the registry for the first time. The registry supports a large set of Databuddy options which are passed to the script via `data-` attributes.

```ts
export const DatabuddyAnalyticsOptions = object({
  clientId: string(),
  scriptUrl: optional(string()),
  apiUrl: optional(string()),
  disabled: optional(boolean()),
  trackScreenViews: optional(boolean()),
  trackPerformance: optional(boolean()),
  trackSessions: optional(boolean()),
  trackWebVitals: optional(boolean()),
  trackErrors: optional(boolean()),
  trackOutgoingLinks: optional(boolean()),
  trackScrollDepth: optional(boolean()),
  trackEngagement: optional(boolean()),
  trackInteractions: optional(boolean()),
  trackAttributes: optional(boolean()),
  trackHashChanges: optional(boolean()),
  trackExitIntent: optional(boolean()),
  trackBounceRate: optional(boolean()),
  enableBatching: optional(boolean()),
  batchSize: optional(number()),
  batchTimeout: optional(number()),
  enableRetries: optional(boolean()),
  maxRetries: optional(number()),
  initialRetryDelay: optional(number()),
  samplingRate: optional(number()),
  sdk: optional(string()),
  sdkVersion: optional(string()),
  enableObservability: optional(boolean()),
  observabilityService: optional(string()),
  observabilityEnvironment: optional(string()),
  observabilityVersion: optional(string()),
  enableLogging: optional(boolean()),
  enableTracing: optional(boolean()),
  enableErrorTracking: optional(boolean()),
})
```

## Example

Track a custom event using the composable proxy (noop in SSR/development):

::code-group

```vue [EventButton.vue]
<script setup lang="ts">
const { proxy } = useScriptDatabuddyAnalytics({ clientId: 'YOUR_CLIENT_ID' })

function sendEvent() {
  proxy?.track('signup_completed', { plan: 'pro' })
}
</script>

<template>
  <button @click="sendEvent">Send Event</button>
</template>
```
