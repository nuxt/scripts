---
title: Google Analytics
description: Use Google Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-analytics.ts
    size: xs
---

[Google Analytics](https://marketingplatform.google.com/about/analytics/) is an analytics solution for Nuxt Apps.

It provides detailed insights into how your website is performing, how users are interacting with your content, and how they are navigating through your site.

The simplest way to load Google Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptGoogleAnalytics](#useScriptGoogleAnalytics) composable.

### Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAnalytics: {
        id: 'YOUR_ID',
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
        googleAnalytics: {
          id: 'YOUR_ID',
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
      googleAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID=<your-id>
          id: '',
        },
      },
    },
  },
})
```

::

## useScriptGoogleAnalytics

The `useScriptGoogleAnalytics` composable lets you have fine-grain control over when and how Google Analytics is loaded on your site.

::code-group

```ts [Default]
const googleAnalytics = useScriptGoogleAnalytics({
  id: 'YOUR_ID'
})
```

```ts [Environment Variables]
// 1. set .env NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID=<your-id>
// 2. set runtimeConfig.public.scripts.googleAnalytics.id to an empty string or fallback
const googleAnalytics = useScriptGoogleAnalytics()
```

::

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Usage

To interact with the Google Analytics API, it's recommended to use script [proxy](/docs/guides/key-concepts#understanding-proxied-functions).

```ts
const { proxy } = useScriptGoogleAnalytics()

proxy.gtag('event', 'page_view')
```

The proxy exposes the `gtag` and `dataLayer` properties, and you should use them following Google Analytics best practices.

### GoogleAnalyticsApi

```ts
export interface GTag {
  // Initialize gtag.js with timestamp
  (command: 'js', value: Date): void

  // Configure a GA4 property
  (command: 'config', targetId: string, configParams?: ConfigParams): void

  // Get a value from gtag
  (command: 'get', targetId: string, fieldName: string, callback?: (field: any) => void): void

  // Send an event to GA4
  (command: 'event', eventName: DefaultEventName, eventParams?: EventParameters): void

  // Set default parameters for all subsequent events
  (command: 'set', params: GtagCustomParams): void

  // Update consent state
  (command: 'consent', consentArg: 'default' | 'update', consentParams: ConsentOptions): void
}

interface GoogleAnalyticsApi {
  dataLayer: Record<string, any>[]
  gtag: GTag
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const GoogleAnalyticsOptions = object({
  /**
   * The Google Analytics ID.
   */
  id: string(),
  /**
   * The datalayer's name you want it to be associated with
   */
  l: optional(string())
})
```

## Multi-Domain and i18n Setup

When working with multi-language applications or different domains, you may need to dynamically configure Google Analytics based on the current locale or domain.

### Using with @nuxtjs/i18n

For applications using [@nuxtjs/i18n](https://i18n.nuxtjs.org/), you can configure different Analytics IDs per locale:

::code-group

```vue [pages/index.vue - Plugin Approach]
<script setup lang="ts">
// Create a plugin to handle GA setup based on locale
// plugins/google-analytics.client.ts
export default defineNuxtPlugin(() => {
  const { locale } = useI18n()

  const analyticsIds = {
    'en': 'GA_ID_ENGLISH',
    'es': 'GA_ID_SPANISH',
    'fr': 'GA_ID_FRENCH'
  }

  useScriptGoogleAnalytics({
    id: analyticsIds[locale.value] || analyticsIds['en']
  })
})
</script>
```

```vue [composables/useAnalytics.ts - Composable Approach]
<script setup lang="ts">
// Create a reusable composable
export const useAnalytics = () => {
  const { locale } = useI18n()

  const analyticsIds = {
    'en': 'GA_ID_ENGLISH',
    'es': 'GA_ID_SPANISH',
    'fr': 'GA_ID_FRENCH'
  }

  return useScriptGoogleAnalytics({
    id: analyticsIds[locale.value] || analyticsIds['en']
  })
}

// Usage in components
const { proxy } = useAnalytics()
proxy.gtag('event', 'page_view')
</script>
```

```ts [nuxt.config.ts - Runtime Config Approach]
export default defineNuxtConfig({
  // Runtime configuration for different locales
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: {
          ids: {
            en: process.env.GA_ID_EN,
            es: process.env.GA_ID_ES,
            fr: process.env.GA_ID_FR
          }
        }
      }
    }
  }
})

// Then in your component:
// const config = useRuntimeConfig()
// const { locale } = useI18n()
// const gaId = config.public.scripts.googleAnalytics.ids[locale.value]
// useScriptGoogleAnalytics({ id: gaId })
```

::

### Custom Domain Detection

For applications with different domains for different markets:

```vue [app.vue]
<script setup lang="ts">
const getDomainBasedAnalyticsId = () => {
  if (process.client) {
    const hostname = window.location.hostname

    const domainToId = {
      'example.com': 'GA_ID_US',
      'example.co.uk': 'GA_ID_UK',
      'example.fr': 'GA_ID_FR',
      'example.de': 'GA_ID_DE'
    }

    return domainToId[hostname] || 'GA_ID_DEFAULT'
  }

  // Server-side fallback - you might use headers or other logic
  return 'GA_ID_DEFAULT'
}

const { proxy } = useScriptGoogleAnalytics({
  id: getDomainBasedAnalyticsId()
})
</script>
```

### Advanced: Dynamic Configuration with Multiple Properties

For complex setups where you need to send data to multiple Analytics properties:

```vue [composables/useMultiAnalytics.ts]
<script setup lang="ts">
export const useMultiAnalytics = () => {
  const { locale } = useI18n()

  // Primary analytics for the current locale
  const primary = useScriptGoogleAnalytics({
    id: getAnalyticsId(locale.value),
    key: 'primary-analytics'
  })

  // Global analytics for cross-locale analysis
  const global = useScriptGoogleAnalytics({
    id: 'GA_ID_GLOBAL',
    key: 'global-analytics'
  })

  const trackEvent = (eventName: string, parameters: any = {}) => {
    // Send to both analytics properties
    primary.proxy.gtag('event', eventName, parameters)
    global.proxy.gtag('event', eventName, {
      ...parameters,
      custom_locale: locale.value
    })
  }

  return {
    primary,
    global,
    trackEvent
  }
}

function getAnalyticsId(locale: string): string {
  const ids = {
    'en': 'GA_ID_ENGLISH',
    'es': 'GA_ID_SPANISH',
    'fr': 'GA_ID_FRENCH'
  }
  return ids[locale] || ids['en']
}
</script>
```

### Best Practices

1. **Performance Considerations**: Only load one Analytics script per page to avoid performance issues
2. **Data Segmentation**: Use custom dimensions to segment data by locale/region instead of separate properties when possible
3. **Cookie Domain**: Ensure your cookie domain settings in GA match your multi-domain setup
4. **Cross-Domain Tracking**: Configure cross-domain tracking if users navigate between different domains

```vue [Example: Locale-specific events]
<script setup lang="ts">
const { proxy } = useAnalytics()
const { locale } = useI18n()

// Send locale-aware events
const trackPurchase = (value: number, currency: string) => {
  proxy.gtag('event', 'purchase', {
    value,
    currency,
    custom_locale: locale.value,
    custom_market: getMarketFromLocale(locale.value)
  })
}
</script>
```

## Example

Using Google Analytics only in production while using `gtag` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptGoogleAnalytics()

// noop in development, ssr
// just works in production, client
proxy.gtag('event', 'conversion-test')
function sendConversion() {
  proxy.gtag('event', 'conversion')
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
