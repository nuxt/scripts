---
title: Fathom Analytics
description: Use Fathom Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/cloudflare-web-analytics.ts
    size: xs
---

[Fathom Analytics](https://usefathom.com/) is a great privacy analytics solution for your Nuxt app. It doesn't gather personal data from your visitors, yet provides detailed insights into how your site is used.

## Nuxt Config

The simplest way to load Fathom Analytics globally in your Nuxt App is to use your Nuxt config, providing your site ID
as a string.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      fathomAnalytics: {
        site: 'YOUR_TOKEN_ID'
      }
    }
  }
})
```

If you'd like to avoid loading the analytics in development, you can conditionally set the config.

```ts [nuxt.config.ts]
import { isDevelopment } from 'std-env'

export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        fathomAnalytics: {
          site: 'YOUR_SITE_ID'
        }
      }
    }
  },
})
```

### With Environment Variables

If you prefer to configure your token using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      fathomAnalytics: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        fathomAnalytics: {
          token: '', // NUXT_SCRIPTS_FATHOM_ANALYTICS_SITE
        },
      },
    },
  },
})
```

```text [.env]
NUXT_SCRIPTS_FATHOM_ANALYTICS_SITE=<YOUR_SITE>
```

## Composable `useScriptFathomAnalytics`

The `useScriptFathomAnalytics` composable lets you have fine-grain control over when and how Fathom Analytics is loaded on your site.

```ts
useScriptFathomAnalytics(options)
```

## Defaults

- **Trigger**: Script will load when Nuxt is hydrated.

## Options

```ts
export const FathomAnalyticsOptions = object({
  /**
   * The Fathom Analytics site ID.
   */
  site: string(),
  /**
   * The Fathom Analytics tracking mode.
   */
  spa: optional(union([literal('auto'), literal('history'), literal('hash')])),
  /**
   * Automatically track page views.
   */
  auto: optional(boolean()),
  /**
   * Enable canonical URL tracking.
   */
  canonical: optional(boolean()),
  /**
   * Honor Do Not Track requests.
   */
  honorDnt: optional(boolean()),
})
```

Additionally like all registry scripts you can provide extra configuration:

- `scriptInput` - HTML attributes to add to the script tag.
- `scriptOptions` - See [Script Options]. Bundling is not supported, `bundle: true` will not do anything.

## Return values

The Fathom Analytics composable injects a `window.fathom` object into the global scope.

```ts
export interface FathomAnalyticsApi {
  beacon: (ctx: { url: string, referrer?: string }) => void
  blockTrackingForMe: () => void
  enableTrackingForMe: () => void
  isTrackingEnabled: () => boolean
  send: (type: string, data: unknown) => void
  setSite: (siteId: string) => void
  sideId: string
  trackPageview: (ctx?: { url: string, referrer?: string }) => void
  trackGoal: (goalId: string, cents: number) => void
  trackEvent: (eventName: string, value: { _value: number }) => void
}
```

You can access the `fathom` object as a proxy directly or await the `$script` promise to access the object. It's recommended
to use the proxy for any void functions.

::code-group

```ts [Proxy]
const { trackGoal } = useScriptFathomAnalytics()

function trackMyGoal() {
  trackGoal('MY_GOAL_ID', 100)
}
```

```ts [Await Promise]
const { $script } = useScriptFathomAnalytics()
$script.then(({ trackGoal }) => {
  trackGoal('MY_GOAL_ID', 100)
})
```

## Example

Loading Fathom Analytics through the `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup>
useScriptFathomAnalytics({
  site: 'YOUR_SITE_ID',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```
