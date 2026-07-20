---
title: Google Analytics
description: Send Google Analytics page views and events with typed consent controls.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-analytics.ts
    size: xs
---

[Google Analytics](https://marketingplatform.google.com/about/analytics/) records page views and events for traffic and audience analysis.

::script-stats
::

::script-docs
::

### Usage

Call [`gtag`](https://developers.google.com/tag-platform/gtagjs/reference) through the script [proxy](/docs/guides/key-concepts#understanding-proxied-functions):

```ts
const { proxy } = useScriptGoogleAnalytics({ id: 'G-XXXXXXXX' })

proxy.gtag('event', 'page_view')
```

The proxy also exposes `dataLayer`.

Examples below that omit `id` assume it is supplied through `scripts.registry.googleAnalytics`.

## Consent Mode

Google Analytics accepts [GCMv2 consent state](https://developers.google.com/tag-platform/security/guides/consent). `defaultConsent` fires before `gtag('js', ...)`{lang="ts"}; use `consent.update()`{lang="ts"} for later choices. Calling `consent.default()`{lang="ts"} after the composable returns queues a new default, but it cannot reproduce that pre-initialization ordering.

::callout{icon="i-heroicons-play" to="https://stackblitz.com/github/nuxt/scripts/tree/main/examples/regional-consent" target="_blank"}
Open the [regional consent example](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/regional-consent) on [StackBlitz](https://stackblitz.com).
::

```vue
<script setup lang="ts">
const { consent } = useScriptGoogleAnalytics({
  id: 'G-XXXXXXXX',
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
</script>
```

`consent.update()`{lang="ts"} and `consent.default()`{lang="ts"} both accept any `Partial<ConsentState>`{lang="ts"}; missing categories stay at their current value. Both methods validate input against the canonical GCMv2 schema and warn via `consola` on unknown keys or non-`granted`/`denied` values. For pre-`gtag('js')`{lang="ts"} setup beyond consent defaults, `onBeforeGtagStart` remains available as a general escape hatch.

### Per-region defaults

Pass an array to `defaultConsent` to fire one `gtag('consent','default', state)`{lang="ts"} per entry. This matches Google's [region-specific consent pattern](https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced#region-specific-behavior): more specific regions (e.g. `US-CA`) override broader ones (`US`); an entry with no `region` is the unscoped global fallback.

```vue
<script setup lang="ts">
useScriptGoogleAnalytics({
  id: 'G-XXXXXXXX',
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

## Customer-specific GA properties

For a marketplace or multi-tenant app, a second tag can send events to the customer's GA property:

```vue [ProductPage.vue]
<script setup lang="ts">
// Product page with customer-specific tracking
const route = useRoute()
const pageData = await $fetch(`/api/product/${route.params.id}`)

const consumerGtagId = pageData.gtag

// Load gtag with a custom data layer name for customer tracking.
const { proxy: customerGtag } = useScriptGoogleAnalytics({
  key: 'gtag-customer',
  id: consumerGtagId,
  l: 'customerDataLayer',
})

customerGtag.gtag('event', 'product_view', {
  item_id: pageData.id,
  customer_id: pageData.customerId,
  value: pageData.price,
})
</script>
```

## Custom Dimensions and User Properties

Google documents the scopes for [`config`, `set`, and event parameters](https://developers.google.com/tag-platform/gtagjs/reference#parameter_scope). Use `config` for values tied to one GA property and `set` for global defaults.

```ts
const { proxy } = useScriptGoogleAnalytics()

// User properties for this GA4 property
proxy.gtag('config', 'G-XXXXXXXX', {
  user_properties: {
    user_tier: 'premium',
    account_type: 'business',
  },
})

// Event with custom dimensions (register in GA4 Admin > Custom Definitions)
proxy.gtag('event', 'purchase', {
  transaction_id: 'T12345',
  value: 99.99,
  payment_method: 'credit_card', // custom dimension
  discount_code: 'SAVE10' // custom dimension
})

// Default params for all future events
proxy.gtag('set', { country: 'US', currency: 'USD' })
```

## Tracking SPA page views

The registry configures the Google tag and sends its initial page view. `useScriptEventPage` listens to Nuxt's `page:finish` hook, including the initial client render when you register it early enough. In a long-lived component such as `app.vue`, ignore that initial callback but do not accidentally drop the first navigation when registration happens later. Keep the previous URL as `page_referrer`, as described in Google's [SPA measurement guide](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications):

```ts
const { proxy } = useScriptGoogleAnalytics()
const initialPath = useRoute().fullPath
let initialPageSeen = false
let previousLocation: string | undefined

useScriptEventPage(({ title, path }) => {
  const pageLocation = new URL(path, window.location.origin).href

  // page:finish may emit for the initial client render.
  if (!initialPageSeen && path === initialPath) {
    initialPageSeen = true
    previousLocation = pageLocation
    return
  }

  previousLocation ||= new URL(initialPath, window.location.origin).href
  proxy.gtag('event', 'page_view', {
    page_title: title,
    page_location: pageLocation,
    page_referrer: previousLocation,
  })
  previousLocation = pageLocation
})
```

Do not add manual page views if your web stream's enhanced measurement already [tracks browser history changes](https://developers.google.com/analytics/devguides/collection/ga4/views), or you will record duplicate events.

## Proxy queue

The proxy queues `gtag` calls until the script loads and preserves their order.

```ts
const { proxy, onLoaded } = useScriptGoogleAnalytics()

// Fire-and-forget (queued until GA loads)
proxy.gtag('event', 'cta_click', { button_id: 'hero-signup' })

// Need return value? Wait for load
onLoaded(({ gtag }) => {
  gtag('get', 'G-XXXXXXXX', 'client_id', id => console.log(id))
})
```

## Common events

Use Google's [recommended events](https://developers.google.com/analytics/devguides/collection/ga4/events) when one matches the action; custom names remain available for app-specific behavior.

```ts
const { proxy } = useScriptGoogleAnalytics()

// E-commerce
proxy.gtag('event', 'purchase', {
  transaction_id: 'T_12345',
  value: 59.98,
  currency: 'USD',
  items: [{ item_id: 'SKU_12345', item_name: 'Widget', price: 29.99, quantity: 2 }]
})

// Engagement
proxy.gtag('event', 'login', { method: 'Google' })
proxy.gtag('event', 'search', { search_term: 'nuxt scripts' })

// Custom
proxy.gtag('event', 'feature_used', { feature_name: 'dark_mode' })
```

## Debugging

Enable debug mode for a tag configuration:

```ts
proxy.gtag('config', 'G-XXXXXXXX', { debug_mode: true })
```

Use [DebugView, Tag Assistant, or your browser's Network panel](https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot) to verify the tag. In the Network panel, look for successful requests to `google-analytics.com/g/collect` or `analytics.google.com/g/collect`.

For consent mode setup, see the [Consent Guide](/docs/guides/consent).

::script-types
::
