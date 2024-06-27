---
title: Intercom
description: Use Intercom in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/intercom.ts
    size: xs
---

[Intercom](https://www.intercom.com/) is a customer messaging platform that helps you build better customer relationships.

### Nuxt Config Setup

The simplest way to load Matomo Analytics globally in your Nuxt App is to use Nuxt config. Alternatively you can directly
use the [useScriptIntercom](#useScriptIntercom) composable.

If you don't plan to send custom events you can use the [Environment overrides](https://nuxt.com/docs/getting-started/configuration#environment-overrides) to
disable the script in development.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      intercom: {
        app_id: 'YOUR_APP_ID'
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
        intercom: {
          app_id: 'YOUR_APP_ID'
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
      intercom: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
  runtimeConfig: {
    public: {
      scripts: {
        intercom: {
          app_id: '', // NUXT_PUBLIC_SCRIPTS_INTERCOM_APP_ID
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_INTERCOM_APP_ID=<YOUR_APP_ID>
```

## useScriptIntercom

The `useScriptIntercom` composable lets you have fine-grain control over when and how Matomo Analytics is loaded on your site.

```ts
const { Intercom, $script } = useScriptIntercom({
  app_id: 'YOUR_APP_ID'
})

// examples
Intercom('show')
Intercom('update', { name: 'John Doe' })
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### IntercomApi

```ts
export interface IntercomApi {
  Intercom: ((event: 'boot', data?: Input<typeof IntercomOptions>) => void)
  & ((event: 'shutdown') => void)
  & ((event: 'update', options?: Input<typeof IntercomOptions>) => void)
  & ((event: 'hide') => void)
  & ((event: 'show') => void)
  & ((event: 'showSpace', spaceName: 'home' | 'messages' | 'help' | 'news' | 'tasks' | 'tickets' | string) => void)
  & ((event: 'showMessages') => void)
  & ((event: 'showNewMessage', content?: string) => void)
  & ((event: 'onHide', fn: () => void) => void)
  & ((event: 'onShow', fn: () => void) => void)
  & ((event: 'onUnreadCountChange', fn: () => void) => void)
  & ((event: 'trackEvent', eventName: string, metadata?: Record<string, any>) => void)
  & ((event: 'getVisitorId') => Promise<string>)
  & ((event: 'startTour', tourId: string | number) => void)
  & ((event: 'showArticle', articleId: string | number) => void)
  & ((event: 'showNews', newsItemId: string | number) => void)
  & ((event: 'startSurvey', surveyId: string | number) => void)
  & ((event: 'startChecklist', checklistId: string | number) => void)
  & ((event: 'showTicket', ticketId: string | number) => void)
  & ((event: 'showConversation', conversationId: string | number) => void)
  & ((event: 'onUserEmailSupplied', fn: () => void) => void)
  & ((event: string, ...params: any[]) => void)
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const IntercomOptions = object({
  app_id: string(),
  api_base: optional(union([literal('https://api-iam.intercom.io'), literal('https://api-iam.eu.intercom.io'), literal('https://api-iam.au.intercom.io')])),
  name: optional(string()),
  email: optional(string()),
  user_id: optional(string()),
  // customizing the messenger
  alignment: optional(union([literal('left'), literal('right')])),
  horizontal_padding: optional(number()),
  vertical_padding: optional(number()),
})
```

## Example

Using Intercom only in production.

::code-group

```vue [IntercomButton.vue]
<script setup lang="ts">
const { Intercom } = useScriptIntercom()

// noop in development, ssr
// just works in production, client
function showIntercom() {
  Intercom('show')
}
</script>

<template>
  <div>
    <button @click="showIntercom">
      Chat with us
    </button>
  </div>
</template>
```

```ts [nuxt.config.ts Mock development]
import { isDevelopment } from 'std-env'

export default defineNuxtConfig({
  scripts: {
    registry: {
      intercom: isDevelopment
        ? 'mock' // script won't load unless manually callined load()
        : {
            app_id: 'YOUR_APP_ID',
          },
    },
  },
})
```

::
