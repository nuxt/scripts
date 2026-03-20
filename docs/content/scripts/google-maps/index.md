---
title: Google Maps
description: Show performance-optimized Google Maps in your Nuxt app.
links:
  - label: useScriptGoogleMaps
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-maps.ts
    size: xs
  - label: "<ScriptGoogleMaps>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/GoogleMaps/ScriptGoogleMaps.vue
    size: xs
---

[Google Maps](https://maps.google.com/) allows you to embed maps in your website and customize them with your content.

Nuxt Scripts provides a [`useScriptGoogleMaps()`{lang="ts"}](/scripts/google-maps/api/use-script-google-maps){lang="ts"} composable and a headless [`<ScriptGoogleMaps>`{lang="html"}](/scripts/google-maps/api/script-google-maps){lang="html"} component to interact with the Google Maps.

::script-types{exclude-components}
::

## Types

To use Google Maps with full TypeScript support, you will need
to install the `@types/google.maps` dependency.

```bash
pnpm add -D @types/google.maps
```

## Setup

Enable Google Maps in your `nuxt.config` and provide your API key via environment variable:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleMaps: true,
    },
  },
  runtimeConfig: {
    public: {
      scripts: {
        googleMaps: {
          apiKey: '', // NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY=<YOUR_API_KEY>
```

You must add this. It registers server proxy routes that keep your API key server-side:
- `/_scripts/proxy/google-static-maps` for placeholder images
- `/_scripts/proxy/google-maps-geocode` for location search

::callout{color="amber"}
You can pass `api-key` directly on the `<ScriptGoogleMaps>`{lang="html"} component, but this approach is not recommended, as it exposes your key in client-side requests.
::

See [Billing & Permissions](/scripts/google-maps/guides/billing) for API costs and required permissions.

## Quick Start

```vue
<template>
  <ScriptGoogleMaps
    :center="{ lat: -33.8688, lng: 151.2093 }"
    :zoom="12"
  />
</template>
```

See the [Markers & Info Windows](/scripts/google-maps/guides/markers-and-info-windows) guide for adding markers, popups, and custom content. See [Shapes & Overlays](/scripts/google-maps/guides/shapes-and-overlays) for drawing on the map.
