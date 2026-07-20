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

[Calendly](https://calendly.com) provides booking pages and embeddable scheduling widgets. Its booking flow can render inline, in a popup, or behind a floating badge button.

Use [`useScriptCalendly()`{lang="ts"}](/scripts/calendly) for popup and badge widgets. For an inline booking flow, use the headless [`<ScriptCalendlyInlineWidget>`{lang="html"}](/scripts/calendly){lang="html"} component.

::script-stats
::

::script-docs
::

The generated schema also lists `url`, `prefill`, `utm`, and `pageSettings`, but the current composable does not apply those top-level values to a widget. Pass them to an initializer as shown below, or use `<ScriptCalendlyInlineWidget>`{lang="html"}.

Defaults:

- **Trigger: `onNuxtReady`** Direct composable calls load the script when the Nuxt app is ready. The inline component uses an element trigger instead.
- **Stylesheet: Inline** The widget stylesheet (and its close-icon SVG) is inlined on first use, so rendering it does not request those assets from `assets.calendly.com`.

The asset proxy covers `assets.calendly.com` only. The booking iframe still connects directly to `calendly.com`.

Use the proxy for void calls. Use `onLoaded` when you need the loaded `Calendly` global or a stable DOM reference.

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

The component mounts Calendly's inline booking flow inside a host element you control.

It waits until the host element enters the viewport before loading the widget script. The default [element trigger](/docs/guides/script-triggers#element-event-triggers) is `'visible'`.

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

For an above-the-fold widget, set `above-the-fold` and switch the trigger to hydration. This also adds a preconnect to `calendly.com`.

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

Popup and badge widgets have no host element. Open them through the composable:

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

All four widget initializers (`initInlineWidget`, `initPopupWidget`, `initBadgeWidget`, `initPopupWidgetWithText`) accept `prefill` and `utm` options to prepopulate the booking form and tag the booking with marketing attribution. Calendly's [UTM guide](https://help.calendly.com/hc/en-us/articles/4406950779799?locale=en-us) covers the JavaScript option names and the supported embed types.

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
