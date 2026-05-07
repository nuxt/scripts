---
title: Calendly
description: Embed Calendly bookings in your Nuxt app with inline, popup, and badge widgets.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/calendly.ts
  size: xs
---

[Calendly](https://calendly.com) is a scheduling tool that lets visitors book time on your calendar without back-and-forth emails. The Calendly embed widget renders the booking flow inline, in a popup, or behind a floating badge button.

Nuxt Scripts provides a registry script composable [`useScriptCalendly()`{lang="ts"}](/scripts/calendly) to integrate it in your Nuxt app.

::script-stats
::

::script-docs
::

::script-types
::

## Loading Calendly

`useScriptCalendly()`{lang="ts"} loads the official Calendly widget script and stylesheet, then exposes the `Calendly` global through a typed proxy. Method calls made before the real SDK is ready are queued, then replayed once the script finishes loading.

## Examples

### Inline widget

The inline widget mounts inside an element you control. The host element needs an explicit height (Calendly recommends at least 700px) so the iframe is fully visible.

```vue
<script setup lang="ts">
const { onLoaded } = useScriptCalendly()

onLoaded(({ Calendly }) => {
  Calendly.initInlineWidget({
    url: 'https://calendly.com/your-name/30min',
    parentElement: document.getElementById('calendly-inline')!,
  })
})
</script>

<template>
  <div id="calendly-inline" style="min-width: 320px; height: 700px" />
</template>
```

### Popup widget

The popup widget overlays the booking flow on top of your page when triggered by a user action.

```vue
<script setup lang="ts">
const { proxy } = useScriptCalendly()

function openBooking() {
  proxy.Calendly.initPopupWidget({
    url: 'https://calendly.com/your-name/30min',
  })
}
</script>

<template>
  <UButton @click="openBooking">
    Schedule a call
  </UButton>
</template>
```

### Badge widget

The badge widget pins a floating "Schedule time with me" button to the corner of the page.

```vue
<script setup lang="ts">
const { onLoaded } = useScriptCalendly()

onLoaded(({ Calendly }) => {
  Calendly.initBadgeWidget({
    url: 'https://calendly.com/your-name/30min',
    text: 'Schedule time with me',
    color: '#0069ff',
    textColor: '#ffffff',
  })
})
</script>
```

### Prefilling invitee details and UTM parameters

All four widget initialisers accept `prefill` and `utm` options to pre-populate the booking form and tag the booking with marketing attribution.

```vue
<script setup lang="ts">
const { proxy } = useScriptCalendly()

function bookFromCampaign(user: { name: string, email: string }) {
  proxy.Calendly.initPopupWidget({
    url: 'https://calendly.com/your-name/30min',
    prefill: {
      name: user.name,
      email: user.email,
    },
    utm: {
      utmSource: 'website',
      utmMedium: 'cta',
      utmCampaign: 'launch',
    },
  })
}
</script>
```
