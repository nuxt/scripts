---
title: X Pixel
description: Use X Pixel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/x-pixel.ts
  size: xs
---

[X Pixel](https://x.com/) lets you collect, clean, and control your customer data. X helps you to understand your customers and personalize their experience.

Nuxt Scripts provides a registry script composable `useScriptXPixel` to easily integrate X Pixel in your Nuxt app.

### Nuxt Config Setup

The simplest way to load Meta Pixel globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptXPixel](#useScriptXPixel) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      xPixel: {
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
        xPixel: {
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
      xPixel: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        xPixel: {
          id: '', // NUXT_PUBLIC_SCRIPTS_X_PIXEL_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_X_PIXEL_ID=<YOUR_ID>
```

## useScriptXPixel

The `useScriptXPixel` composable lets you have fine-grain control over when and how X Pixel is loaded on your site.

```ts
const { proxy } = useScriptXPixel({
  id: 'YOUR_ID'
})
// example
proxy.twq('event', '<EventId>', {
  value: 1,
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### XPixelApi

```ts
export interface XPixelApi {
  twq: TwqFns & {
    loaded: boolean
    version: string
    queue: any[]
  }
}
type TwqFns =
  ((event: 'event', eventId: string, data?: EventObjectProperties) => void)
  & ((event: 'config', id: string) => void)
  & ((event: string, ...params: any[]) => void)
interface ContentProperties {
  content_type?: string | null
  content_id?: string | number | null
  content_name?: string | null
  content_price?: string | number | null
  num_items?: string | number | null
  content_group_id?: string | number | null
}
interface EventObjectProperties {
  value?: string | number | null
  currency?: string | null
  conversion_id?: string | number | null
  email_address?: string | null
  phone_number?: string | null
  contents: ContentProperties[]
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const XPixelOptions = object({
  id: string(),
  version: optional(string()),
})
```

## Example

Using X Pixel only in production while using `twq` to send a conversion event.

::code-group

```vue [ConversionButton.vue]
<script setup lang="ts">
const { proxy } = useScriptXPixel()

// noop in development, ssr
// just works in production, client
function sendConversion() {
  proxy.twq('event', 'Purchase', {
    value: 1,
    currency: 'USD'
  })
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
