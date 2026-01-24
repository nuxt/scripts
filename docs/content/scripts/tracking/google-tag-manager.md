---
title: Google Tag Manager
description: Use Google Tag Manager in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-tag-manager.ts
    size: xs
---

[Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) is a tag management system that allows you to quickly and easily update tags and code snippets on your website or mobile app, such as those intended for traffic analysis and marketing optimization.

::callout
You may not need Google Tag Manager with Nuxt Scripts. GTM is 82kb and will slow down your site.
Nuxt Scripts provides many features you can easily
implement within your Nuxt app. If you're using GTM for Google Analytics, you can use the `useScriptGoogleAnalytics` composable instead.
::

## Loading Globally

If you'd like to avoid loading the analytics in development, you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) in your Nuxt config.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: '<YOUR_ID>'
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
        googleTagManager: {
          id: '<YOUR_ID>',
        }
      }
    }
  }
})
```

```ts [Default consent mode]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: '<YOUR_ID>',
        defaultConsent: {
          // This can be any string or number value according to GTM documentation
          // Here we set all consent types to 'denied' by default
          'ad_user_data': 'denied',
          'ad_personalization': 'denied',
          'ad_storage': 'denied',
          'analytics_storage': 'denied',
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
      googleTagManager: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        googleTagManager: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_TAG_MANAGER_ID=<your-id>
          id: '',
        },
      },
    },
  },
})
```

::

## useScriptGoogleTagManager

The `useScriptGoogleTagManager` composable lets you have fine-grain control over when and how Google Tag Manager is loaded on your site.


```ts
const { proxy } = useScriptGoogleTagManager({
  id: 'YOUR_ID' // id is only needed if you haven't configured globally
})
// example
proxy.dataLayer.push({ event: 'conversion', value: 1 })
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about `proxy`.

### Guide: Sending Page Events

If you'd like to manually send page events to Google Tag Manager, you can use the `proxy` with the [useScriptEventPage](/docs/api/use-script-event-page) composable.
This composable will trigger the provided function on route change after the page title has been updated.

```ts
const { proxy } = useScriptGoogleTagManager({
  id: 'YOUR_ID' // id is only needed if you haven't configured globally
})

useScriptEventPage(({ title, path }) => {
  // triggered on route change after title is updated
  proxy.dataLayer.push({
    event: 'pageview',
    title,
    path
  })
})
```

### GoogleTagManagerApi

```ts
interface GoogleTagManagerApi {
  dataLayer: Record<string, any>[]
  google_tag_manager: GoogleTagManager
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
/**
 * GTM configuration options with improved documentation
 */
export const GoogleTagManagerOptions = object({
    /** GTM container ID (format: GTM-XXXXXX) */
    id: string(),

    /** Optional dataLayer variable name */
    l: optional(string()),

    /** Authentication token for environment-specific container versions */
    auth: optional(string()),

    /** Preview environment name */
    preview: optional(string()),

    /** Forces GTM cookies to take precedence when true */
    cookiesWin: optional(union([boolean(), literal('x')])),

    /** Enables debug mode when true */
    debug: optional(union([boolean(), literal('x')])),

    /** No Personal Advertising - disables advertising features when true */
    npa: optional(union([boolean(), literal('1')])),

    /** Custom dataLayer name (alternative to "l" property) */
    dataLayer: optional(string()),

    /** Environment name for environment-specific container */
    envName: optional(string()),

    /** Referrer policy for analytics requests */
    authReferrerPolicy: optional(string()),
    
    /** Default consent settings for GTM */
    defaultConsent: optional(record(string(), union([string(), number()]))),
  })
```

### Options types

```ts
type GoogleTagManagerInput = typeof GoogleTagManagerOptions & { onBeforeGtmStart?: (gtag: Gtag) => void }
```

## Examples

### Server-Side GTM Setup

Server-side GTM moves tag execution to your server for better privacy, performance (~500ms faster), and ad-blocker bypass.

**Prerequisites:** [Server-side GTM container](https://tagmanager.google.com), hosting ([Cloud Run](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide) / [Docker](https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide)), and a custom domain.

#### Configuration

Override the script source with your custom domain:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: 'GTM-XXXXXX',
        scriptInput: {
          src: 'https://gtm.example.com/gtm.js'
        }
      }
    }
  }
})
```

For environment tokens (`auth`, `preview`), find them in GTM: Admin > Environments > Get Snippet.

#### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Script blocked by ad blocker | Custom domain detected as tracker | Use a non-obvious subdomain name (avoid `gtm`, `analytics`, `tracking`) |
| Cookies expire after 7 days in Safari | ITP treats subdomain as third-party | Use same-origin setup or implement cookie keeper |
| Preview mode not working | Missing or incorrect auth/preview tokens | Copy tokens from GTM: Admin > Environments > Get Snippet |
| CORS errors | Server container misconfigured | Ensure your server container allows requests from your domain |
| `gtm.js` returns 404 | Incorrect path mapping | Verify your CDN/proxy routes `/gtm.js` to the container |

For infrastructure setup, see [Cloud Run](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide) or [Docker](https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide) guides.

### Basic Usage

Using Google Tag Manager only in production while using `dataLayer` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptGoogleTagManager()

// noop in development, ssr
// just works in production, client
proxy.dataLayer.push({ event: 'conversion-step', value: 1 })
function sendConversion() {
  proxy.dataLayer.push({ event: 'conversion', value: 1 })
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

## First-Party Mode

This script supports [First-Party Mode](/docs/guides/first-party) which routes all traffic through your domain for improved privacy and ad blocker bypass.

When enabled globally via `scripts.firstParty: true`, this script will:
- Load from your domain instead of `www.googletagmanager.com`
- Route all GTM requests through your server
- Hide user IP addresses from Google
- Strip fingerprinting parameters

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      googleTagManager: { id: 'GTM-XXXXXX' }
    }
  }
})
```

To opt-out for this specific script:

```ts
useScriptGoogleTagManager({
  id: 'GTM-XXXXXX',
  scriptOptions: {
    firstParty: false // Load directly from Google
  }
})
```

## Configuring GTM before it starts

`useScriptGoogleTagManager` initializes Google Tag Manager by itself. This means it pushes the `js`, `config` and the `gtm.start` events for you.

If you need to configure GTM before it starts, for example [setting the consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), you have two options:

### Option 1: Using `defaultConsent` in nuxt.config (Recommended)

If you're configuring GTM in `nuxt.config`, use the `defaultConsent` option. See the [Default consent mode](#loading-globally) example above.

### Option 2: Using `onBeforeGtmStart` callback

If you're calling `useScriptGoogleTagManager` with the ID directly in a component (not in nuxt.config), use the `onBeforeGtmStart` hook which runs right before the `gtm.start` event is pushed.

::callout{icon="i-heroicons-exclamation-triangle" color="warning"}
`onBeforeGtmStart` only works when the GTM ID is passed directly to `useScriptGoogleTagManager`, not when configured globally in nuxt.config. For global config, use the `defaultConsent` option instead.
::

::callout{icon="i-heroicons-play" to="https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent" target="_blank"}
Try the live [Cookie Consent Example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent) or [Granular Consent Example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/granular-consent) on StackBlitz.
::

#### Consent Mode v2 Signals

| Signal | Purpose |
|--------|---------|
| `ad_storage` | Cookies for advertising |
| `ad_user_data` | Send user data to Google for ads |
| `ad_personalization` | Personalized ads (remarketing) |
| `analytics_storage` | Cookies for analytics |

#### Updating Consent

When the user accepts, call `gtag('consent', 'update', ...)`:

```ts
function acceptCookies() {
  window.gtag?.('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  })
}
```

To block GTM entirely until consent, combine with [useScriptTriggerConsent](/docs/guides/consent).

```vue
<script setup lang="ts">
const consent = useState('consent', () => 'denied')

const { proxy } = useScriptGoogleTagManager({
  onBeforeGtmStart: (gtag) => {
    // set default consent state to denied
    gtag('consent', 'default', {
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'wait_for_update': 500,
    })

    // if consent was already given, update gtag accordingly
    if (consent.value === 'granted') {
      gtag('consent', 'update', {
        ad_user_data: consent.value,
        ad_personalization: consent.value,
        ad_storage: consent.value,
        analytics_storage: consent.value
      })
    }
  }
})

// push pageview events to dataLayer
useScriptEventPage(({ title, path }) => {
  proxy.dataLayer.push({
    event: 'pageview',
    title,
    path
  })
})
</script>
```
