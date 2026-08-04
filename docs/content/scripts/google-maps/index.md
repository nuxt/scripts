---
title: Google Maps
description: Load interactive maps, static maps, and location search on demand.
links:
  - label: useScriptGoogleMaps
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-maps.ts
    size: xs
  - label: "<ScriptGoogleMaps>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/GoogleMaps/ScriptGoogleMaps.vue
    size: xs
---

[Google Maps](https://maps.google.com/) provides interactive and static maps for websites.

Nuxt Scripts provides a [`useScriptGoogleMaps()`{lang="ts"}](/scripts/google-maps/api/use-script-google-maps){lang="ts"} composable and a headless [`<ScriptGoogleMaps>`{lang="html"}](/scripts/google-maps/api/script-google-maps){lang="html"} component for working with Google Maps.

::script-types{exclude-components}
::

## Types

Install `@types/google.maps` for full TypeScript support.

```bash
pnpm add -D @types/google.maps
```

## Setup

Enable Google Maps in your `nuxt.config` and provide your API key via environment variable:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      // Register infrastructure without loading Maps on every page.
      // <ScriptGoogleMaps> will load it after its element trigger fires.
      googleMaps: {},
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY=<YOUR_API_KEY>
```

Add `trigger: 'onNuxtReady'` to the registry entry only when you want the interactive Maps API to load globally. It bypasses the component's default interaction delay because the shared script instance is already loading.

::callout{color="amber"}
The Maps JavaScript and Static Maps APIs send this key to the browser. Follow Google's [API security guidance](https://developers.google.com/maps/api-security-best-practices): apply a Websites application restriction, allow only the APIs this site uses, and configure quota limits. Runtime config keeps deployment values configurable; it does not make a `NUXT_PUBLIC_` key secret.
::

See [Billing & Permissions](/scripts/google-maps/guides/billing) for API costs and required permissions.

## Quick Start

```vue
<template>
  <ScriptGoogleMaps
    :map-options="{
      center: { lat: -33.8688, lng: 151.2093 },
      zoom: 12,
    }"
  />
</template>
```

See the [Markers & Info Windows](/scripts/google-maps/guides/markers-and-info-windows) guide for adding markers, popups, and custom content. See [Shapes & Overlays](/scripts/google-maps/guides/shapes-and-overlays) for drawing on the map.
