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

## Quick start

Pass a MapLibre style URL or an inline style specification. This example uses MapLibre's public demonstration style.

```vue
<script setup lang="ts">
import type { LngLatLike } from 'maplibre-gl'

const center = ref<LngLatLike>([144.9631, -37.8136])
</script>

<template>
  <ScriptMapLibreMap
    v-model:center="center"
    map-style="https://demotiles.maplibre.org/style.json"
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
The MapLibre demo tiles are intended for examples. Choose a hosted or self-hosted tile service for production, follow its terms, and retain the attribution required by your data and style providers.
::

## MapLibre, OpenMapTiles, and OpenStreetMap

These projects solve different parts of the mapping stack:

- **MapLibre GL JS** is the browser renderer supported by this integration.
- **OpenMapTiles** is an open vector-tile schema, toolchain, and collection of styles. Point `map-style` at an OpenMapTiles-compatible style URL to use it with MapLibre.
- **OpenStreetMap** supplies open geographic data. Its public standard tile service is not a general-purpose production CDN.

You can use MapLibre with OpenMapTiles from a hosted provider, serve an OpenMapTiles style and tiles yourself, or supply any compatible MapLibre style. The renderer does not lock you to a particular provider.

## Components

- [`<ScriptMapLibreMap>`{lang="html"}](/scripts/maplibre/api/script-maplibre-map) creates the map and controls lazy loading.
- [`<ScriptMapLibreMarker>`{lang="html"}](/scripts/maplibre/api/marker) adds an accessible, reactive marker.
- [`<ScriptMapLibrePopup>`{lang="html"}](/scripts/maplibre/api/popup) binds slotted HTML to a marker or coordinate.
- [`<ScriptMapLibreNavigationControl>`{lang="html"}](/scripts/maplibre/api/navigation-control) adds zoom, compass, and pitch controls.
- [`<ScriptMapLibreGeoJson>`{lang="html"}](/scripts/maplibre/api/geojson) manages a GeoJSON source and its style layers.

## Accessibility

Give each interactive map a useful `aria-label`. Because the rendered geography is a WebGL canvas, use the `description` slot for essential locations, routes, or links that must be available to assistive technology. Give each marker a unique `aria-label`.

For a purely decorative map, set `:interactive="false"`. The component disables input, removes the map from the accessibility tree, and makes its descendants inert.

## Styles and Content Security Policy

By default, Nuxt Scripts injects MapLibre's version-pinned stylesheet from UNPKG when the SDK begins loading. To serve it through your own build instead:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  css: ['maplibre-gl/dist/maplibre-gl.css'],
})
```

```vue
<ScriptMapLibreMap
  :center="center"
  :inject-styles="false"
  map-style="/maps/style.json"
/>
```

The standard MapLibre build creates a Blob worker and needs matching `worker-src` and `child-src` CSP directives. For a stricter policy, self-host MapLibre's CSP build and worker:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      maplibre: {
        scriptInput: { src: '/maplibre-gl-csp.js' },
      },
    },
  },
})
```

```vue
<ScriptMapLibreMap
  :center="center"
  map-style="/maps/style.json"
  worker-url="/maplibre-gl-csp-worker.js"
/>
```

See MapLibre's [CSP directives](https://maplibre.org/maplibre-gl-js/docs/#csp-directives) for the complete policy requirements.
