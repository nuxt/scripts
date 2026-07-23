---
title: MapLibre GL JS
description: Add lazy-loaded, provider-agnostic vector maps to Nuxt with MapLibre GL JS.
links:
  - label: useScriptMapLibre
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/maplibre.ts
    size: xs
  - label: "<ScriptMapLibreMap>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/MapLibre/ScriptMapLibreMap.vue
    size: xs
---

[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) is an open-source WebGL renderer for interactive vector maps. It renders the map and handles interaction; you choose the style, tile source, attribution, geocoding, and routing services separately.

Nuxt Scripts supports MapLibre GL JS 5.24 through the [`useScriptMapLibre()`{lang="ts"}](/scripts/maplibre/api/use-script-maplibre) composable and declarative components for common map resources. First-party mode can bundle the JavaScript SDK. Nuxt Scripts loads the required MapLibre stylesheet separately by default.

::script-types{exclude-components}
::

## Setup

Install MapLibre for its TypeScript definitions, then enable the registry entry:

```bash
pnpm add -D maplibre-gl
```

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      maplibre: { trigger: false },
    },
  },
})
```

## Quick Start

Pass a MapLibre style URL or an inline style specification. This example uses OpenFreeMap's keyless Liberty style.

```vue
<script setup lang="ts">
import type { LngLatLike } from 'maplibre-gl'

const center = ref<LngLatLike>([144.9631, -37.8136])
</script>

<template>
  <ScriptMapLibreMap
    v-model:center="center"
    map-style="https://tiles.openfreemap.org/styles/liberty"
    :zoom="12"
    width="100%"
    :height="480"
    aria-label="Map of central Melbourne"
  >
    <template #description>
      Interactive street map centred on Melbourne CBD.
    </template>

    <ScriptMapLibreNavigationControl position="top-right" />

    <ScriptMapLibreMarker
      :position="center"
      aria-label="Melbourne CBD"
    >
      <ScriptMapLibrePopup>
        Melbourne CBD
      </ScriptMapLibrePopup>
    </ScriptMapLibreMarker>
  </ScriptMapLibreMap>
</template>
```

MapLibre coordinates use `[longitude, latitude]` order. This is the reverse of the `[latitude, longitude]` convention used by Leaflet.

The default `visible` trigger defers the SDK, style, and tile requests until the map approaches the viewport. The component reserves its dimensions during SSR to avoid layout shift.

::callout{color="amber"}
OpenFreeMap's public instance needs no API key, but it has no SLA. Read [Styles & Providers](/scripts/maplibre/guides/styles-and-providers) before choosing a production style service.
::

See [Delivery Tracker](/scripts/maplibre/guides/delivery-tracker) for a complete route tracker with reactive progress, selectable checkpoints, and an accessible text alternative.

## Components

- [`<ScriptMapLibreMap>`{lang="html"}](/scripts/maplibre/api/script-maplibre-map) creates the map and controls lazy loading.
- [`<ScriptMapLibreMarker>`{lang="html"}](/scripts/maplibre/api/marker) adds an accessible, reactive marker.
- [`<ScriptMapLibrePopup>`{lang="html"}](/scripts/maplibre/api/popup) binds slotted HTML to a marker or coordinate.
- [`<ScriptMapLibreNavigationControl>`{lang="html"}](/scripts/maplibre/api/navigation-control) adds zoom, compass, and pitch controls.
- [`<ScriptMapLibreGeoJson>`{lang="html"}](/scripts/maplibre/api/geojson) manages a GeoJSON source and its style layers.

## Guides

- [Delivery Tracker](/scripts/maplibre/guides/delivery-tracker) builds a practical route tracker from reactive markers and styled GeoJSON.
- [Styles & Providers](/scripts/maplibre/guides/styles-and-providers) separates the renderer, style, tile service, and map data choices.
- [Performance, CSP & Accessibility](/scripts/maplibre/guides/performance-csp-and-accessibility) covers loading triggers, WebGL fallbacks, workers, and decorative maps.
