---
title: Bing UET
description: Load Microsoft Advertising UET, send conversion events, and update its ad-storage consent signal.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/bing-uet.ts
  size: xs
---

[Microsoft Advertising UET](https://about.ads.microsoft.com/en/tools/performance/conversion-tracking) tracks conversions and supplies audience data to Microsoft Advertising.

[`useScriptBingUet()`{lang="ts"}](/scripts/bing-uet) loads the UET tag and exposes its event queue.

::script-stats
::

::script-docs
::

::script-types
::

## Examples

### Tracking Conversions

Microsoft recommends the newer event syntax, which replaces short parameters such as `gv` and `gc` with [`revenue_value` and `currency`](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_uetv2syntaxupdate_2).

```vue
<script setup lang="ts">
const { proxy } = useScriptBingUet()

function trackPurchase() {
  proxy.uetq.push('event', 'purchase', {
    revenue_value: 49.99,
    currency: 'USD',
    transaction_id: 'ORDER-123',
  })
}
</script>
```

### Custom Events

```vue
<script setup lang="ts">
const { proxy } = useScriptBingUet()

function trackSignup() {
  proxy.uetq.push('event', 'sign_up', {
    event_category: 'engagement',
    event_label: 'newsletter',
  })
}
</script>
```

### Consent Mode

Bing UET supports [advanced consent mode](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_uet_consent). Only `ad_storage` is honored; set the initial state with `defaultConsent` and update it at runtime with `consent.update()`{lang="ts"}:

```vue
<script setup lang="ts">
const { consent } = useScriptBingUet({
  defaultConsent: { ad_storage: 'denied' },
})

function grantConsent() {
  consent.update({ ad_storage: 'granted' })
}
</script>
```

Microsoft requires sites using consent mode to send either `granted` or `denied` on each page. Its current enforcement covers the EEA, United Kingdom, and Switzerland.

`onBeforeUetStart` remains available for any other pre-load setup.
