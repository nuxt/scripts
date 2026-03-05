---

title: Google Tag Manager
description: Use Google Tag Manager in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-tag-manager.ts
    size: xs

---

[Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) is a tag management system that allows you to quickly and easily update tags and code snippets on your website or mobile app, such as those intended for traffic analysis and marketing optimization.

::callout
You may not need Google Tag Manager with Nuxt Scripts. GTM is 82kb and will slow down your site.
Nuxt Scripts provides many features you can easily
implement within your Nuxt app. If you're using GTM for Google Analytics, you can use the [`useScriptGoogleAnalytics()`](/scripts/google-analytics){lang="ts"} composable instead.
::

::script-stats
::

::script-docs
::

### Guide: Sending Page Events

If you'd like to manually send page events to Google Tag Manager, you can use the `proxy` with the [`useScriptEventPage()`](/docs/api/use-script-event-page){lang="ts"} composable.
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

## Configuring GTM before it starts

[`useScriptGoogleTagManager()`](/scripts/google-tag-manager){lang="ts"} initializes Google Tag Manager by itself. This means it pushes the `js`, `config` and the `gtm.start` events for you.

If you need to configure GTM before it starts, for example [setting the consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), you have two options:

### Option 1: Using `defaultConsent` in nuxt.config (Recommended)

If you're configuring GTM in `nuxt.config`, use the `defaultConsent` option. See the [Default consent mode](#loading-globally) example above.

### Option 2: Using `onBeforeGtmStart` callback

If you're calling [`useScriptGoogleTagManager()`](/scripts/google-tag-manager){lang="ts"} with the ID directly in a component (not in nuxt.config), use the `onBeforeGtmStart` hook which runs right before the `gtm.start` event is pushed.

::callout{icon="i-heroicons-exclamation-triangle" color="warning"}
`onBeforeGtmStart` only works when the GTM ID is passed directly to [`useScriptGoogleTagManager()`](/scripts/google-tag-manager){lang="ts"}, not when configured globally in nuxt.config. For global config, use the `defaultConsent` option instead.
::

::callout{icon="i-heroicons-play" to="https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent" target="_blank"}
Try the live [Cookie Consent Example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent) or [Granular Consent Example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/granular-consent) on [StackBlitz](https://stackblitz.com).
::

#### Consent Mode v2 Signals

| Signal | Purpose |
|--------|---------|
| `ad_storage` | Cookies for advertising |
| `ad_user_data` | Send user data to Google for ads |
| `ad_personalization` | Personalized ads (remarketing) |
| `analytics_storage` | Cookies for analytics |

#### Updating Consent

When the user accepts, call `gtag('consent', 'update', ...)`{lang="ts"}:

```ts
function acceptCookies() {
  window.gtag?.('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  })
}
```

To block GTM until consent, combine with [`useScriptTriggerConsent()`](/docs/guides/consent){lang="ts"}.

```vue
<script setup lang="ts">
const consent = useState('consent', () => 'denied')

const { proxy } = useScriptGoogleTagManager({
  onBeforeGtmStart: (gtag) => {
    // set default consent state to denied
    gtag('consent', 'default', {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })

    // if consent was already given, update gtag accordingly
    if (consent.value === 'granted') {
      gtag('consent', 'update', {
        ad_user_data: consent.value,
        ad_personalization: consent.value,
        ad_storage: consent.value,
        analytics_storage: consent.value
      })
    }
  }
})

// push pageview events to dataLayer
useScriptEventPage(({ title, path }) => {
  proxy.dataLayer.push({
    event: 'pageview',
    title,
    path
  })
})
</script>
```
