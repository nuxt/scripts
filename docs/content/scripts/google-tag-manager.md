---
title: Google Tag Manager
description: Load a GTM web container and push page or consent events from Nuxt.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-tag-manager.ts
    size: xs
---

[Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) loads tags from a web container, letting you change tracking configuration without redeploying the app.

::callout
GTM can load any tags configured in your container, so its performance cost varies with that configuration. If you only need Google Analytics, the [`useScriptGoogleAnalytics()`{lang="ts"}](/scripts/google-analytics){lang="ts"} composable may be simpler.
::

::callout{icon="i-heroicons-information-circle"}
Nuxt Scripts only loads the GTM **container**. Tracking comes from the tags and triggers in your GTM workspace or from your own `dataLayer.push` calls. For automatic page, click, scroll, and video tracking, enable [GA4 Enhanced Measurement](https://support.google.com/analytics/answer/9216061) for the GA4 web data stream.
::

::script-stats
::

::script-docs
::

### Sending page events

Use the proxy with [`useScriptEventPage()`{lang="ts"}](/docs/api/use-script-event-page){lang="ts"} to push an event after Nuxt finishes the initial client render or a later route change and updates the page title:

```ts
const { proxy } = useScriptGoogleTagManager({
  id: 'YOUR_ID' // id is only needed if you haven't configured globally
})

useScriptEventPage(({ title, path }) => {
  // Runs for the initial render when registered early, then for route changes.
  proxy.dataLayer.push({
    event: 'pageview',
    title,
    path
  })
})
```

## Consent Mode

Google Tag Manager accepts [GCMv2 consent state](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic). `defaultConsent` enters the queue before the `gtm.js` event; use `consent.update()`{lang="ts"} for later choices. If client state determines the initial default, resolve it before calling the composable and pass it through `defaultConsent`. A later `consent.default()`{lang="ts"} call queues another default after initialization and cannot reproduce the original ordering.

::callout{icon="i-heroicons-play" to="https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent" target="_blank"}
Open the [cookie consent](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent), [granular consent](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/granular-consent), or [regional consent](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/regional-consent) example on [StackBlitz](https://stackblitz.com).
::

### Consent Mode v2 signals

| Signal | Purpose |
|--------|---------|
| `ad_storage` | Cookies for advertising |
| `ad_user_data` | Send user data to Google for ads |
| `ad_personalization` | Personalized ads (remarketing) |
| `analytics_storage` | Cookies for analytics |

### Example

```vue
<script setup lang="ts">
const { proxy, consent } = useScriptGoogleTagManager({
  id: 'GTM-XXXXXX',
  defaultConsent: {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  },
})

function acceptAll() {
  consent.update({
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  })
}

function savePreferences(choices: { analytics: boolean, marketing: boolean }) {
  consent.update({
    analytics_storage: choices.analytics ? 'granted' : 'denied',
    ad_storage: choices.marketing ? 'granted' : 'denied',
    ad_user_data: choices.marketing ? 'granted' : 'denied',
    ad_personalization: choices.marketing ? 'granted' : 'denied',
  })
}

useScriptEventPage(({ title, path }) => {
  proxy.dataLayer.push({ event: 'pageview', title, path })
})
</script>
```

### Per-region defaults

Pass an array to `defaultConsent` to queue one consent-default command per entry, in order. This matches Google's [region-specific consent pattern](https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced#region-specific-behavior): more specific regions (e.g. `US-CA`) override broader ones (`US`); an entry with no `region` is the unscoped global fallback.

```vue
<script setup lang="ts">
useScriptGoogleTagManager({
  id: 'GTM-XXXXXX',
  defaultConsent: [
    {
      // EEA + UK + Switzerland: start denied and wait 500ms for a choice.
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      region: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH'],
      wait_for_update: 500,
    },
    {
      // Everywhere else: granted by default.
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    },
  ],
})
</script>
```

The module forwards each entry verbatim, in input order. Precedence between region-scoped and unscoped defaults is enforced by gtag at runtime, not by ordering.

`consent.update()`{lang="ts"} and `consent.default()`{lang="ts"} both accept any `Partial<ConsentState>`{lang="ts"}; missing categories stay at their current value. Both methods validate input against the canonical GCMv2 schema and warn via `consola` on unknown keys or non-`granted`/`denied` values. `onBeforeGtmStart` remains available as a general escape hatch for any other pre-`gtm.start` setup (only when the GTM ID is passed directly to the composable, not via `nuxt.config`).

::script-types
::

## Examples

### Server-side GTM

With [server-side tagging](https://developers.google.com/tag-platform/tag-manager/server-side/intro), the web container still runs in the browser and sends measurement requests to a server container that you operate. Set each supported tag's transport URL (for example, `server_container_url` in a Google tag) to the server container; changing the GTM loader URL alone does not reroute those requests.

Prerequisites include a [server-side GTM container](https://tagmanager.google.com), hosting such as [Cloud Run](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide) or a [manual deployment](https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide), and a [custom domain](https://developers.google.com/tag-platform/tag-manager/server-side/custom-domain).

#### Configuration

If your configured first-party tagging domain serves the web container loader, override the source and retain the container ID query parameter:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: 'GTM-XXXXXX',
        trigger: 'onNuxtReady',
        scriptInput: {
          src: 'https://analytics.example.com/gtm.js?id=GTM-XXXXXX'
        }
      }
    }
  }
})
```

This source override only changes where the browser loads `gtm.js`. Configure the web and server containers to route measurement requests to the server container, following Google's [server-side tagging documentation](https://developers.google.com/tag-platform/tag-manager/server-side).
