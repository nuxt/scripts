---
title: Calendly
description: Embed Calendly bookings in your Nuxt app with inline, popup, and badge widgets.
links:
  - label: useScriptCalendly
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/calendly.ts
    size: xs
  - label: "<ScriptCalendlyInlineWidget>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptCalendlyInlineWidget.vue
    size: xs
---

[Calendly](https://calendly.com) is a scheduling tool that lets visitors book time on your calendar without back-and-forth emails. The Calendly embed widget renders the booking flow inline, in a popup, or behind a floating badge button.

Nuxt Scripts provides a registry script composable [`useScriptCalendly()`{lang="ts"}](/scripts/calendly) and a headless [`<ScriptCalendlyInlineWidget>`{lang="html"}](/scripts/calendly){lang="html"} component to integrate it in your Nuxt app.

::script-stats
::

::script-docs
::

The composable comes with the following defaults:
- **Trigger: Client** Script will load when Nuxt is hydrating.
- **Stylesheet: Inline** The widget stylesheet (and its close-icon SVG) is inlined on first use, so no IP leak to `assets.calendly.com` on render.

You can access the `Calendly` global as a proxy directly or await `onLoaded` to use it. Recommended to use the proxy for void calls; `onLoaded` is convenient when you need a stable DOM reference.

::code-group

```ts [Proxy]
const { proxy } = useScriptCalendly()
function openBooking() {
  proxy.Calendly.initPopupWidget({
    url: 'https://calendly.com/your-name/30min',
  })
}
```

```ts [onLoaded]
const { onLoaded } = useScriptCalendly()
onLoaded(({ Calendly }) => {
  Calendly.initInlineWidget({
    url: 'https://calendly.com/your-name/30min',
    parentElement: document.getElementById('calendly-inline')!,
  })
})
```

::

## [`<ScriptCalendlyInlineWidget>`{lang="html"}](/scripts/calendly){lang="html"}

The [`<ScriptCalendlyInlineWidget>`{lang="html"}](/scripts/calendly){lang="html"} component wraps [`useScriptCalendly()`{lang="ts"}](/scripts/calendly){lang="ts"} for the most common embed shape: an inline booking flow mounted into a host element you control.

It's optimized for performance by using [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading the Calendly widget script once the host element comes into view. By default the trigger is `'visible'`.

```vue
<script setup lang="ts">
const ready = ref(false)
</script>

<template>
  <ScriptCalendlyInlineWidget
    url="https://calendly.com/your-name/30min"
    @ready="ready = true"
  />
</template>
```

### Above-the-fold loading

If the widget is above the fold and you want it to start loading on hydration rather than on visibility, set `above-the-fold` (adds a preconnect to `calendly.com`) and override the trigger.

```vue
<ScriptCalendlyInlineWidget
  url="https://calendly.com/your-name/30min"
  above-the-fold
  trigger="onNuxtReady"
/>
```

### Prefill, UTM, and page settings

```vue
<ScriptCalendlyInlineWidget
  url="https://calendly.com/your-name/30min"
  :prefill="{ name: 'Ada Lovelace', email: 'ada@example.com' }"
  :utm="{ utmSource: 'website', utmMedium: 'cta', utmCampaign: 'launch' }"
  :page-settings="{ hideEventTypeDetails: true, hideGdprBanner: true }"
/>
```

### Slots

The component exposes `loading`, `awaitingLoad`, and `error` slots for placeholder UX while the script trigger waits or the script load fails. The default `loading` slot renders an accessible spinner.

## Popup and badge widgets

Popup and badge modes have no host element, so they're driven from the composable directly:

::code-group

```ts [Popup]
const { proxy } = useScriptCalendly()
function open() {
  proxy.Calendly.initPopupWidget({
    url: 'https://calendly.com/your-name/30min',
  })
}
```

```ts [Badge]
const { onLoaded } = useScriptCalendly()
onLoaded(({ Calendly }) => {
  Calendly.initBadgeWidget({
    url: 'https://calendly.com/your-name/30min',
    text: 'Schedule time with me',
    color: '#0069ff',
    textColor: '#ffffff',
  })
})
```

::

## Prefilling invitee details and UTM parameters

All four widget initialisers (`initInlineWidget`, `initPopupWidget`, `initBadgeWidget`, `initPopupWidgetWithText`) accept `prefill` and `utm` options to pre-populate the booking form and tag the booking with marketing attribution.

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

::script-types
::

## Example

Loading Calendly through `app.vue` when Nuxt is ready, with the inline widget rendered on a booking page.

```vue [app.vue]
<script setup lang="ts">
useScriptCalendly({
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})
</script>
```
