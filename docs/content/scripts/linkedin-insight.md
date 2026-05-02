---
title: LinkedIn Insight Tag
description: Use the LinkedIn Insight Tag in your Nuxt app to track conversions, retarget visitors, and learn about your audience.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/linkedin-insight.ts
  size: xs
---

The [LinkedIn Insight Tag](https://business.linkedin.com/marketing-solutions/insight-tag) is a lightweight JavaScript snippet for conversion tracking, retargeting, and audience insights on LinkedIn Ads campaigns.

Nuxt Scripts provides a registry script composable [`useScriptLinkedInInsight()`{lang="ts"}](/scripts/linkedin-insight) to integrate it in your Nuxt app.

::script-stats
::

::script-docs
::

::script-types
::

## Examples

### Tracking a conversion

```vue
<script setup lang="ts">
const { proxy } = useScriptLinkedInInsight({
  id: '541681',
})

function trackPurchase() {
  proxy.lintrk('track', { conversion_id: 20529377 })
}
</script>
```

### Per-event deduplication with the Conversions API

When you also send conversions through LinkedIn's server-side Conversions API, pass the same `event_id` to both — LinkedIn discards the server-side duplicate and counts the Insight Tag event. See [LinkedIn deduplication](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication?view=li-lms-2026-01).

```vue
<script setup lang="ts">
const { proxy } = useScriptLinkedInInsight({
  id: '541681',
})

function trackSignup() {
  const eventId = crypto.randomUUID()
  proxy.lintrk('track', { conversion_id: 20529377, event_id: eventId })
  // Send the same eventId to your server-side Conversions API call.
}
</script>
```

### Page-load conversion deduplication

For dedup on the auto-fired page-view, set `eventId` at registration. The composable assigns `window._linkedin_event_id` *before* the Insight Tag base code runs, so the page-view URL includes `&eventId=…` automatically.

```vue
<script setup lang="ts">
const { proxy } = useScriptLinkedInInsight({
  id: '541681',
  eventId: 'page-load-event-id-123',
})
</script>
```

### Enhanced matching with `setUserData`

Pass plain email — the Insight Tag SHA-256 hashes it before sending. See [LinkedIn enhanced matching](https://www.linkedin.com/help/lms/answer/a6246095).

```vue
<script setup lang="ts">
const { proxy } = useScriptLinkedInInsight({
  id: '541681',
})

function onSignupSuccess(email: string) {
  proxy.lintrk('setUserData', { email })
}
</script>
```

### SPA virtual page views

By default, the Insight Tag fires a page-view exactly once when the script loads, so SPA route changes go untracked. Opt in to per-route tracking with `enableAutoSpaTracking`:

```vue
<script setup lang="ts">
useScriptLinkedInInsight({
  id: '541681',
  enableAutoSpaTracking: true,
})
</script>
```

When enabled, the composable suppresses the script's built-in auto-page-view (via `window._wait_for_lintrk = true`) and fires `lintrk('track')` on Nuxt's `page:finish` hook — once per route, including the initial SSR page.

### Multiple Partner IDs

If you need to push more than one Partner ID onto `window._linkedin_data_partner_ids`, pass an array. The first ID is used as the primary `_linkedin_partner_id` global.

```vue
<script setup lang="ts">
useScriptLinkedInInsight({
  id: ['541681', '987654'],
})
</script>
```
