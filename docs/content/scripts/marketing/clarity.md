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

### Nuxt Config Setup

The simplest way to load Clarity globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptClarity](#useScriptClarity) composable.

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

::

#### With Environment Variables

If you prefer to configure your id using environment variables.

```ts [nuxt.config.ts]
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
          id: '', // NUXT_PUBLIC_SCRIPTS_CLARITY_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_CLARITY_ID=<YOUR_ID>
```

## useScriptClarity

The `useScriptClarity` composable lets you have fine-grain control over when and how Clarity is loaded on your site.

```ts
const { clarity } = useScriptClarity({
  id: 'YOUR_ID'
})
// example
clarity("identify", "custom-id", "custom-session-id", "custom-page-id", "friendly-name")	
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

## Example

Using Clarity only in production while using `clarity` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup>
const { clarity } = useScriptClarity()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  clarity('event', 'conversion')
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

```ts [nuxt.config.ts Mock development]
import { isDevelopment } from 'std-env'

export default defineNuxtConfig({
  scripts: {
    registry: {
      clarity: isDevelopment
        ? 'mock' // script won't load unless manually callined load()
        : {
            id: 'YOUR_ID',
          },
    },
  },
})
```

::
