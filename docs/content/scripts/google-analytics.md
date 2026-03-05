---

title: Google Analytics
description: Use Google Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-analytics.ts
    size: xs

---

[Google Analytics](https://marketingplatform.google.com/about/analytics/) is an analytics solution for Nuxt Apps.

It provides detailed insights into how your website is performing, how users are interacting with your content, and how they are navigating through your site.

::script-stats
::

::script-docs
::

### Usage

To interact with the Google Analytics API, it's recommended to use script [proxy](/docs/guides/key-concepts#understanding-proxied-functions).

```ts
const { proxy } = useScriptGoogleAnalytics()

proxy.gtag('event', 'page_view')
```

The proxy exposes the `gtag` and `dataLayer` properties, and you should use them following Google Analytics best practices.

::script-types
::

### Customer/Consumer ID Tracking

For e-commerce or multi-tenant applications where you need to track customer-specific analytics alongside your main tracking:

```vue [ProductPage.vue]
<script setup lang="ts">
// Product page with customer-specific tracking
const route = useRoute()
const pageData = await $fetch(`/api/product/${route.params.id}`)

// Load gtag with a custom dataLayer name for customer tracking
const { proxy: customerGtag, load } = useScriptGoogleAnalytics({
  key: 'gtag-customer',
  l: 'customerDataLayer', // Custom dataLayer name
})

// Configure customer's tracking ID when available
const consumerGtagId = computed(() => pageData?.gtag)

if (consumerGtagId.value) {
  // Configure the customer's GA4 property
  customerGtag.gtag('config', consumerGtagId.value)

  // Send customer-specific events
  customerGtag.gtag('event', 'product_view', {
    item_id: pageData.id,
    customer_id: pageData.customerId,
    value: pageData.price
  })
}
</script>
```

## Custom Dimensions and User Properties

```ts
const { proxy } = useScriptGoogleAnalytics()

// User properties (persist across sessions)
proxy.gtag('set', 'user_properties', {
  user_tier: 'premium',
  account_type: 'business'
})

// Event with custom dimensions (register in GA4 Admin > Custom Definitions)
proxy.gtag('event', 'purchase', {
  transaction_id: 'T12345',
  value: 99.99,
  payment_method: 'credit_card',  // custom dimension
  discount_code: 'SAVE10'         // custom dimension
})

// Default params for all future events
proxy.gtag('set', { country: 'US', currency: 'USD' })
```

## Manual Page View Tracking (SPAs)

GA4 auto-tracks page views. To disable and track manually:

```ts
const { proxy } = useScriptGoogleAnalytics()

// Disable automatic page views
proxy.gtag('config', 'G-XXXXXXXX', { send_page_view: false })

// Track on route change
const router = useRouter()
router.afterEach((to) => {
  proxy.gtag('event', 'page_view', { page_path: to.fullPath })
})
```

## Proxy Queuing

The proxy queues all `gtag` calls until the script loads. Calls are SSR-safe, adblocker-resilient, and order-preserved.

```ts
const { proxy, onLoaded } = useScriptGoogleAnalytics()

// Fire-and-forget (queued until GA loads)
proxy.gtag('event', 'cta_click', { button_id: 'hero-signup' })

// Need return value? Wait for load
onLoaded(({ gtag }) => {
  gtag('get', 'G-XXXXXXXX', 'client_id', (id) => console.log(id))
})
```

## Common Event Patterns

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

Enable debug mode via config or URL param `?debug_mode=true`:

```ts
proxy.gtag('config', 'G-XXXXXXXX', { debug_mode: true })
```

View events in GA4: **Admin > DebugView**. Install [GA Debugger extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) for console logging.

For consent mode setup, see the [Consent Guide](/docs/guides/consent).
