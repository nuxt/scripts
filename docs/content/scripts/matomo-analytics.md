---
title: Matomo Analytics
description: Track Matomo page views and events with built-in consent controls.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/matomo-analytics.ts
    size: xs
---

[Matomo Analytics](https://matomo.org/) tracks page views and events with either Matomo Cloud or a self-hosted instance.

::script-stats
::

::script-docs
::

The `watch` option defaults to `true`. The composable registers its `useScriptEventPage` watcher immediately, independently of the script trigger. Register the composable before the initial `page:finish` hook to track that route and later navigations; registering it afterward only catches subsequent navigations. Pass `siteId` explicitly: the current runtime does not apply its intended fallback of `1` when the option is omitted.

```ts
useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
  siteId: 2,
  // watch: true, // Enabled by default; tracks pages automatically.
})
```

Push commands to `_paq` for custom dimensions or manual events:

```ts
const { proxy } = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID', // e.g. nuxt.matomo.cloud
  siteId: 2,
})

// set custom dimension
proxy._paq.push(['setCustomDimension', 1, 'value'])
// send page event
proxy._paq.push(['trackPageView'])
```

See the [Config Schema](#config-schema) for the full option list.

## Custom page tracking

Provide `watch: false` to disable the built-in page watcher, then queue the initial route yourself if you need it:

```ts
const { proxy } = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID',
  siteId: 2,
  watch: false, // disable automatic tracking
})

// watch: false disables the built-in page watcher.
proxy._paq.push(['trackPageView'])

// Custom page tracking with additional logic
useScriptEventPage((payload) => {
  // Set custom dimensions based on route
  if (payload.path.startsWith('/products')) {
    proxy._paq.push(['setCustomDimension', 1, 'Product Page'])
  }

  // Standard Matomo tracking calls (same as built-in watch behavior)
  proxy._paq.push(['setDocumentTitle', payload.title])
  proxy._paq.push(['setCustomUrl', payload.path])
  proxy._paq.push(['trackPageView'])

  // Track additional custom events
  proxy._paq.push(['trackEvent', 'Navigation', 'PageView', payload.path])
})
```

### Using self-hosted Matomo

For self-hosted Matomo, set `matomoUrl` to customize tracking. Set `trackerUrl` as well if you use a custom tracking endpoint.

```ts
useScriptMatomoAnalytics({
  // For example, https://your-url.com/matomo.js and /matomo.php both exist.
  matomoUrl: 'https://your-url.com',
  siteId: 2,
})
```

## Consent mode

Matomo has a built-in [tracking-consent API](https://developer.matomo.org/guides/tracking-consent) gated by `requireConsent`. Set `defaultConsent` to arm the gate at registration, then call `consent.give()`{lang="ts"} / `consent.forget()`{lang="ts"} at runtime.

### `defaultConsent`

| Value | Behavior |
|-------|-----------|
| `'required'` | Pushes `['requireConsent']`. Matomo tracks nothing until the user opts in. |
| `'given'` | Pushes `['requireConsent']` then `['setConsentGiven']`. Tracking starts immediately. |
| `'not-required'` | Default Matomo behavior (no consent gating). |

::callout{icon="i-heroicons-exclamation-triangle" color="warning"}
`consent.give()`{lang="ts"} and `consent.forget()`{lang="ts"} are **no-ops unless `defaultConsent: 'required'` or `'given'` was set at registration**. Matomo ignores `setConsentGiven` and `forgetConsentGiven` when `requireConsent` hasn't been pushed. A development-only warning fires if you forget.
::

### Example

```vue
<script setup lang="ts">
const { consent } = useScriptMatomoAnalytics({
  cloudId: 'YOUR_CLOUD_ID',
  siteId: 2,
  defaultConsent: 'required',
})

function onAccept() {
  consent.give()
}
function onRevoke() {
  consent.forget()
}
</script>
```

### Using white-label Matomo

For a white-label Matomo deployment, set `trackerUrl` and `scriptInput.src` to customize tracking.

```ts
useScriptMatomoAnalytics({
  siteId: 2,
  trackerUrl: 'https://c.staging.cookie3.co/lake',
  scriptInput: {
    src: 'https://cdn.cookie3.co/scripts/latest/cookie3.analytics.min.js',
  },
})
```

::script-types
::
