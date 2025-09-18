---
title: Rybbit Analytics
description: Use Rybbit Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/rybbit.ts
    size: xs
---

[Rybbit Analytics](https://www.rybbit.io/) is a privacy-focused analytics solution for tracking user activity on your website without compromising your users' privacy.

The simplest way to load Rybbit Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptRybbitAnalytics](#useScriptRybbitAnalytics) composable.

## Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      rybbitAnalytics: {
        siteId: 'YOUR_SITE_ID'
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
        rybbitAnalytics: {
          siteId: 'YOUR_SITE_ID',
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
      rybbitAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        rybbitAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_RYBBIT_ANALYTICS_SITE_ID=<your-site-id>
          siteId: ''
        },
      },
    },
  },
})
```

::

## useScriptRybbitAnalytics

The `useScriptRybbitAnalytics` composable lets you have fine-grain control over when and how Rybbit Analytics is loaded on your site.

```ts
const rybbit = useScriptRybbitAnalytics({
  siteId: 'YOUR_SITE_ID'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Self-hosted Rybbit Analytics

If you are using a self-hosted version of Rybbit Analytics, you can provide a custom script source:

```ts
useScriptRybbitAnalytics({
  scriptInput: {
    src: 'https://your-rybbit-instance.com/api/script.js'
  },
  siteId: 'YOUR_SITE_ID'
})
```

### RybbitAnalyticsApi

```ts
export interface RybbitAnalyticsApi {
  /**
   * Tracks a page view
   */
  pageview: () => void

  /**
   * Tracks a custom event
   * @param name Name of the event
   * @param properties Optional properties for the event
   */
  event: (name: string, properties?: Record<string, any>) => void

  /**
   * Sets a custom user ID for tracking logged-in users
   * @param userId The user ID to set (will be stored in localStorage)
   */
  identify: (userId: string) => void

  /**
   * Clears the stored user ID
   */
  clearUserId: () => void

  /**
   * Gets the currently set user ID
   * @returns The current user ID or null if not set
   */
  getUserId: () => string | null
  /**
   * @deprecated use top level functions instead
   */
  rybbit: RybbitAnalyticsApi
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const RybbitAnalyticsOptions = object({
  siteId: union([string(), number()]), // required
  autoTrackPageview: optional(boolean()),
  trackSpa: optional(boolean()),
  trackQuery: optional(boolean()),
  trackOutbound: optional(boolean()),
  trackErrors: optional(boolean()),
  sessionReplay: optional(boolean()),
  webVitals: optional(boolean()),
  skipPatterns: optional(array(string())),
  maskPatterns: optional(array(string())),
  debounce: optional(number()),
  apiKey: optional(string()),
})
```

#### Configuration Options

- `siteId` (required): Your Rybbit Analytics site ID
`autoTrackPageview`: Set to `false` to disable automatic tracking of the initial pageview when the script loads. You will need to manually call the pageview function to track pageviews. Default: `true`
- `trackSpa`: Set to `false` to disable automatic pageview tracking for single page applications
- `trackQuery`: Set to `false` to disable tracking of URL query strings
- `trackOutbound`: Set to `false` to disable automatic tracking of outbound link clicks. Default: `true`
- `trackErrors`: Set to `true` to enable automatic tracking of JavaScript errors and unhandled promise rejections. Only tracks errors from the same origin to avoid noise from third-party scripts. Default: `false`
- `sessionReplay`: Set to `true` to enable session replay recording. Captures user interactions, mouse movements, and DOM changes for debugging and user experience analysis. Default: `false`
- `webVitals`: Set to `true` to enable Web Vitals performance metrics collection (LCP, CLS, INP, FCP, TTFB). Web Vitals are disabled by default to reduce script size and network requests. Default: `false`
- `skipPatterns`: Array of URL path patterns to ignore
- `maskPatterns`: Array of URL path patterns to mask for privacy
- `debounce`: Delay in milliseconds before tracking a pageview after URL changes
- `apiKey`: API key for tracking from localhost during development. Bypasses origin validation for self-hosted Rybbit Analytics instances

## Example

Using Rybbit Analytics only in production while tracking custom events.

::code-group

```vue [EventTracking.vue]
<script setup lang="ts">
const { proxy } = useScriptRybbitAnalytics()

// Track a pageview manually
function trackPage() {
  proxy.pageview()
}

// Track a custom event
function trackEvent() {
  proxy.event('button_click', { buttonId: 'signup' })
}
</script>

<template>
  <div>
    <button @click="trackPage">
      Track Custom Page
    </button>
    <button @click="trackEvent">
      Track Custom Event
    </button>
  </div>
</template>
```

::
