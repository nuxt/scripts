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

::script-docs
::

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
