---
title: Hotjar
description: Use Hotjar in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/hotjar.ts
  size: xs
---

[Hotjar](https://www.hotjar.com/) is a screen recorder and heatmap tool that helps you understand how users interact with your website.

Nuxt Scripts provides a registry script composable `useScriptHotjar` to easily integrate Hotjar in your Nuxt app.

### Nuxt Config Setup

The simplest way to load Hotjar globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptHotjar](#useScriptHotjar) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      hotjar: {
        id: 123456, // your id
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
        hotjar: {
          id: 123456, // your id
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
      hotjar: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        hotjar: {
          id: 123456, // NUXT_PUBLIC_SCRIPTS_HOTJAR_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_HOTJAR_ID=<YOUR_ID>
```

## useScriptHotjar

The `useScriptHotjar` composable lets you have fine-grain control over when and how Hotjar is loaded on your site.

```ts
const { hj, $script } = useScriptHotjar({
  id: 123546,
})
// example
hj('identify', 123456, {
  name: 'John Doe',
  email: 'john@doe.com'
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### HotjarApi

```ts
export interface HotjarApi {
  hj: ((event: 'identify', userId: string, attributes?: Record<string, any>) => void)
  & ((event: 'stateChange', path: string) => void)
  & ((event: 'event', eventName: string) => void)
  & ((event: string, arg?: string) => void)
  & ((...params: any[]) => void) & {
    q: any[]
  }
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const HotjarOptions = object({
  id: number(),
  sv: optional(number()),
})
```

## Example

Using Hotjar only in production while using `hj` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { hj } = useScriptHotjar()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  hj('event', 'conversion')
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
      hotjar: isDevelopment
        ? 'mock' // script won't load unless manually calling load()
        : {
            id: 123456 // your id
          },
    },
  },
})
```

::
