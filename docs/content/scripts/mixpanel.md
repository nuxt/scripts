---

title: Mixpanel
description: Use Mixpanel in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/mixpanel-analytics.ts
  size: xs

---

[Mixpanel](https://mixpanel.com) is a product analytics platform that helps you understand how users interact with your application through event tracking, funnels, and retention analysis.

Nuxt Scripts provides a registry script composable [`useScriptMixpanelAnalytics()`](/scripts/mixpanel){lang="ts"} to easily integrate Mixpanel in your Nuxt app.

::script-stats
::

::script-docs
::

::script-types
::

## Composable Usage

The simplest way to load Mixpanel is through `nuxt.config`:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      mixpanelAnalytics: {
        token: 'YOUR_PROJECT_TOKEN',
      }
    }
  }
})
```

### Tracking Events

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

function trackSignup() {
  proxy.mixpanel.track('Sign Up', {
    plan: 'premium',
    source: 'landing_page',
  })
}
</script>
```

### Identifying Users

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

function login(userId: string) {
  proxy.mixpanel.identify(userId)
  proxy.mixpanel.people.set({
    $name: 'Jane Doe',
    $email: 'jane@example.com',
    plan: 'premium',
  })
}
</script>
```

### Registering Super Properties

Super properties are sent with every subsequent event:

```vue
<script setup lang="ts">
const { proxy } = useScriptMixpanelAnalytics()

proxy.mixpanel.register({
  app_version: '2.0.0',
  platform: 'web',
})
</script>
```

### Environment Variables

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      mixpanelAnalytics: true,
    }
  },
  runtimeConfig: {
    public: {
      scripts: {
        mixpanelAnalytics: {
          token: '', // NUXT_PUBLIC_SCRIPTS_MIXPANEL_ANALYTICS_TOKEN
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_MIXPANEL_ANALYTICS_TOKEN=YOUR_PROJECT_TOKEN
```
