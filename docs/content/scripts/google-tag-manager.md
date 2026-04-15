---
title: Google Tag Manager
description: Use Google Tag Manager in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-tag-manager.ts
    size: xs
---

[Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) is a tag management system that allows you to quickly and easily update tags and code snippets on your website or mobile app, such as those intended for traffic analysis and marketing optimization.

::callout
You may not need Google Tag Manager with Nuxt Scripts. GTM is 82kb and will slow down your site.
Nuxt Scripts provides many features you can easily
implement within your Nuxt app. If you're using GTM for Google Analytics, you can use the [`useScriptGoogleAnalytics()`{lang="ts"}](/scripts/google-analytics){lang="ts"} composable instead.
::

::script-stats
::

::script-docs
::

### Guide: Sending Page Events

If you'd like to manually send page events to Google Tag Manager, you can use the `proxy` with the [`useScriptEventPage()`{lang="ts"}](/docs/api/use-script-event-page){lang="ts"} composable.
This composable triggers the provided function on route change after Nuxt updates the page title.

```ts
const { proxy } = useScriptGoogleTagManager({
  id: 'YOUR_ID' // id is only needed if you haven't configured globally
})

useScriptEventPage(({ title, path }) => {
  // triggered on route change after title is updated
  proxy.dataLayer.push({
    event: 'pageview',
    title,
    path
  })
})
```

## Consent Mode

Google Tag Manager natively consumes [GCMv2 consent state](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic). Set the default with `defaultConsent` (pushes `['consent','default', state]` onto the dataLayer before the `gtm.js` event) and call `consent.update()`{lang="ts"} at runtime.

::callout{icon="i-heroicons-play" to="https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent" target="_blank"}
Try the live [Cookie Consent Example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent) or [Granular Consent Example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/granular-consent) on [StackBlitz](https://stackblitz.com).
::

### Consent Mode v2 Signals

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

`onBeforeGtmStart` remains available as a general escape hatch for any other pre-`gtm.start` setup (only when the GTM ID is passed directly to the composable, not via `nuxt.config`).

::script-types
::

## Examples

### Server-Side GTM Setup

Server-side GTM moves tag execution to your server for better privacy, performance (~500ms faster), and ad-blocker bypass.

**Prerequisites:** [Server-side GTM container](https://tagmanager.google.com), hosting ([Cloud Run](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide) / [Docker](https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide)), and a custom domain.

#### Configuration

Override the script source with your custom domain:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleTagManager: {
        id: 'GTM-XXXXXX',
        scriptInput: {
          src: 'https://gtm.example.com/gtm.js'
        }
      }
    }
  }
})
```

For environment tokens (`auth`, `preview`), find them in GTM: Admin > Environments > Get Snippet.

#### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Script blocked by ad blocker | Custom domain detected as tracker | Use a non-obvious subdomain name (avoid `gtm`, `analytics`, `tracking`) |
| Cookies expire after 7 days in Safari | ITP treats subdomain as third-party | Use same-origin setup or implement cookie keeper |
| Preview mode not working | Missing or incorrect auth/preview tokens | Copy tokens from GTM: Admin > Environments > Get Snippet |
| CORS errors | Server container misconfigured | Ensure your server container allows requests from your domain |
| `gtm.js` returns 404 | Incorrect path mapping | Verify your CDN/proxy routes `/gtm.js` to the container |

For infrastructure setup, see [Cloud Run](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide) or [Docker](https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup-guide) guides.
