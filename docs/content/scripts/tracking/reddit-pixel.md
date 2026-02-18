---
title: Reddit Pixel
description: Use Reddit Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/reddit-pixel.ts
  size: xs
---

[Reddit Pixel](https://advertising.reddithelp.com/en/categories/custom-audiences-and-conversion-tracking/reddit-pixel) helps you track conversions and build audiences for your Reddit advertising campaigns.

Nuxt Scripts provides a registry script composable `useScriptRedditPixel` to easily integrate Reddit Pixel in your Nuxt app.

### Nuxt Config Setup

The simplest way to load Reddit Pixel globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptRedditPixel](#useScriptRedditPixel) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      redditPixel: {
        id: 'YOUR_ID'
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
        redditPixel: {
          id: 'YOUR_ID',
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
      redditPixel: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        redditPixel: {
          id: '', // NUXT_PUBLIC_SCRIPTS_REDDIT_PIXEL_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_REDDIT_PIXEL_ID=<YOUR_ID>
```

## useScriptRedditPixel

The `useScriptRedditPixel` composable lets you have fine-grain control over when and how Reddit Pixel is loaded on your site.

```ts
const { proxy } = useScriptRedditPixel({
  id: 'YOUR_ID'
})
// example
proxy.rdt('track', 'Lead')
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### RedditPixelApi

```ts
export interface RedditPixelApi {
  rdt: RdtFns & {
    sendEvent: (rdt: RedditPixelApi['rdt'], args: unknown[]) => void
    callQueue: unknown[]
  }
}
type RdtFns
  = & ((event: 'init', id: string) => void)
    & ((event: 'track', eventName: string) => void)
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const RedditPixelOptions = object({
  id: string(),
})
```

## First-Party Mode

This script supports [First-Party Mode](/docs/guides/first-party) which routes all traffic through your domain for improved privacy and ad blocker bypass.

When enabled globally via `scripts.firstParty: true`, this script will:
- Load from your domain instead of `alb.reddit.com`
- Route tracking requests through your server
- Anonymize user IP addresses to subnet level
- Generalize device fingerprinting data to common buckets

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      redditPixel: { id: 'YOUR_ID' }
    }
  }
})
```

To opt-out for this specific script:

```ts
useScriptRedditPixel({
  id: 'YOUR_ID',
  scriptOptions: {
    firstParty: false // Load directly from Reddit
  }
})
```

## Example

Using Reddit Pixel only in production while using `rdt` to send a tracking event.

::code-group

```vue [TrackingButton.vue]
<script setup lang="ts">
const { proxy } = useScriptRedditPixel()

// noop in development, ssr
// just works in production, client
function trackConversion() {
  proxy.rdt('track', 'Lead')
}
</script>

<template>
  <div>
    <button @click="trackConversion">
      Track Conversion
    </button>
  </div>
</template>
```

::