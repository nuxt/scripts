---
title: Umami Analytics
description: Use Umami Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/umami-analytics.ts
    size: xs
---

[Umami](https://umami.is/) collects all the metrics you care about to help you make better decisions.

The simplest way to load Umami Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptUmamiAnalytics](#useScriptUmamiAnalytics) composable.

## Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      umamiAnalytics: {
        websiteId: 'YOUR_WEBSITE_ID'
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
        umamiAnalytics: {
          websiteId: 'YOUR_WEBSITE_ID',
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
      umamiAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        umamiAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_UMAMI_ANALYTICS_WEBSITE_ID=<your websiteId>
          websiteId: ''
        },
      },
    },
  },
})
```

::

## useScriptUmamiAnalytics

The `useScriptUmamiAnalytics` composable lets you have fine-grain control over when and how Umami Analytics is loaded on your site.

```ts
const umami = useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Self-hosted Umami

If you are using a self-hosted version of Umami, you will need to provide an explicit src for the script so that
the API events are sent to the correct endpoint.

```ts
useScriptUmamiAnalytics({
  scriptInput: {
    src: 'https://my-self-hosted/script.js'
  }
})
```

### UmamiAnalyticsApi

```ts
export interface UmamiAnalyticsApi {
  track: ((payload?: Record<string, any>) => void) &((event_name: string, event_data: Record<string, any>) => void)
  identify: (session_data?: Record<string, any> | string) => void
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const UmamiAnalyticsOptions = object({
  websiteId: string(), // required
  /**
   * By default, Umami will send data to wherever the script is located.
   * You can override this to send data to another location.
   */
  hostUrl: optional(string()),
  /**
   * By default, Umami tracks all pageviews and events for you automatically.
   * You can disable this behavior and track events yourself using the tracker functions.
   * https://umami.is/docs/tracker-functions
   */
  autoTrack: optional(boolean()),
  /**
   * If you want the tracker to only run on specific domains, you can add them to your tracker script.
   * This is a comma delimited list of domain names.
   * Helps if you are working in a staging/development environment.
   */
  domains: optional(array(string())),
  /**
   * If you want the tracker to collect events under a specific tag.
   * Events can be filtered in the dashboard by a specific tag.
   */
  tag: optional(string()),
  /**
   * Function that will be called before data is sent to Umami.
   * The function takes two parameters: type and payload.
   * Return the payload to continue sending, or return a falsy value to cancel.
   */
  beforeSend: optional(union([
    custom<(type: string, payload: Record<string, any>) => Record<string, any> | null | false>(input => typeof input === 'function'),
    string(),
  ])),
})
```

## Advanced Features

### Session Identification

Umami v2.18.0+ supports setting unique session IDs using the `identify` function. You can pass either a string (unique ID) or an object with session data:

```ts
const { proxy } = useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID'
})

// Using a unique string ID
proxy.identify('user-12345')

// Using session data object
proxy.identify({
  userId: 'user-12345',
  plan: 'premium'
})
```

### Data Filtering with beforeSend

The `beforeSend` option allows you to inspect, modify, or cancel data before it's sent to Umami. This is useful for implementing custom privacy controls or data filtering:

```ts
useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID',
  beforeSend: (type, payload) => {
    // Log what's being sent (for debugging)
    console.log('Sending to Umami:', type, payload)
    
    // Filter out sensitive data
    if (payload.url && payload.url.includes('private')) {
      return false // Cancel send
    }
    
    // Modify payload before sending
    return {
      ...payload,
      referrer: '' // Remove referrer for privacy
    }
  }
})
```

You can also provide a string with the name of a globally defined function:

```ts
// Define function globally
window.myBeforeSendHandler = (type, payload) => {
  return checkPrivacyRules(payload) ? payload : false
}

useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID',
  beforeSend: 'myBeforeSendHandler'
})
```

## Example

Using Umami Analytics only in production while using `track` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptUmamiAnalytics()

// noop in development, ssr
// just works in production, client
proxy.track('event', { name: 'conversion-step' })

function sendConversion() {
  proxy.track('event', { name: 'conversion' })
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
