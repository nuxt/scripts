---
title: Clarity
description: Use Clarity in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/clarity.ts
  size: xs
---

[Clarity](https://clarity.microsoft.com/) by Microsoft is a screen recorder and heatmap tool that helps you understand how users interact with your website.

Nuxt Scripts provides a registry script composable `useScriptClarity` to easily integrate Clarity in your Nuxt app.

The simplest way to load Clarity globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptClarity](#useScriptClarity) composable.

## Loading Globally

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      clarity: {
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
        clarity: {
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
      clarity: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        clarity: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_CLARITY_ID=<your-id>
          id: '',
        },
      },
    },
  },
})
```

::

## useScriptClarity

The `useScriptClarity` composable lets you have fine-grain control over when and how Clarity is loaded on your site.

```ts
const { proxy } = useScriptClarity({
  id: 'YOUR_ID'
})
// example
proxy.clarity("identify", "custom-id", "custom-session-id", "custom-page-id", "friendly-name")	
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### ClarityApi

```ts
type ClarityFunctions = ((fn: 'start', options: { content: boolean, cookies: string[], dob: number, expire: number, projectId: string, upload: string }) => void)
  & ((fn: 'identify', id: string, session?: string, page?: string, userHint?: string) => Promise<{
  id: string
  session: string
  page: string
  userHint: string
}>)
  & ((fn: 'consent') => void)
  & ((fn: 'set', key: any, value: any) => void)
  & ((fn: 'event', value: any) => void)
  & ((fn: 'upgrade', upgradeReason: any) => void)
  & ((fn: string, ...args: any[]) => void)

export interface ClarityApi {
  clarity: ClarityFunctions & {
    q: any[]
    v: string
  }
}

```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const ClarityOptions = object({
  /**
   * The Clarity token.
   */
  id: pipe(string(), minLength(10)),
})
```

## First-Party Mode

This script supports [First-Party Mode](/docs/guides/first-party) which routes all traffic through your domain for improved privacy and ad blocker bypass.

When enabled globally via `scripts.firstParty: true`, this script will:
- Load from your domain instead of `www.clarity.ms`
- Route data/event collection (`d.clarity.ms`, `e.clarity.ms`) through your server
- Anonymize user IP addresses to subnet level
- Generalize device fingerprinting data to common buckets

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    firstParty: true,
    registry: {
      clarity: { id: 'YOUR_ID' }
    }
  }
})
```

To opt-out for this specific script:

```ts
useScriptClarity({
  id: 'YOUR_ID',
  scriptOptions: {
    firstParty: false // Load directly from Microsoft
  }
})
```

## Example

Using Clarity only in production while using `clarity` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptClarity()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  proxy.clarity('event', 'conversion')
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
