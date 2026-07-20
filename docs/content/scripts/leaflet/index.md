---
title: Leaflet
description: Add lightweight, provider-agnostic interactive maps to Nuxt with lazy loading.
links:
  - label: useScriptLeaflet
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/leaflet.ts
    size: xs
  - label: "<ScriptLeafletMap>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/Leaflet/ScriptLeafletMap.vue
    size: xs
---

[Leaflet](https://leafletjs.com/) is an open-source JavaScript library for interactive maps. It provides the map renderer and interaction model; you choose the tile provider, attribution, geocoding, and routing services separately.

Nuxt Scripts supports Leaflet 1.9.4 through the [`useScriptLeaflet()`{lang="ts"}](/scripts/leaflet/api/use-script-leaflet) composable and a small set of declarative components. First-party mode bundles the SDK by default, while Nuxt Scripts embeds the styles and marker images locally.

::script-types{exclude-components}
::

## Setup

Install Leaflet's types, then enable the registry entry:

```bash
pnpm add -D @types/leaflet
```

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      leaflet: { trigger: false },
    },
  },
})
```

## Quick start

Leaflet does not include map imagery. This example explicitly chooses OpenStreetMap's standard tile service and keeps its required visible attribution.

```vue
<script setup lang="ts">
const center = ref<[number, number]>([-37.8136, 144.9631])
</script>

<template>
  <ScriptLeafletMap
    :center="center"
    :zoom="13"
    width="100%"
    :height="480"
    aria-label="Map of central Melbourne"
  >
    <ScriptLeafletTileLayer
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      :options="{
        maxZoom: 19,
        attribution: '&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap contributors</a>',
      }"
    />

    <ScriptLeafletMarker
      :position="center"
      alt="Melbourne CBD"
    >
      <ScriptLeafletPopup>
        Melbourne CBD
      </ScriptLeafletPopup>
    </ScriptLeafletMarker>
  </ScriptLeafletMap>
</template>
```

The default `visible` trigger defers the Leaflet SDK and all tile requests until the map approaches the viewport. The component reserves its dimensions during SSR to avoid layout shift.

::callout{color="amber"}
OpenStreetMap's standard tile servers are donation-funded and have no SLA. Keep attribution visible, do not prefetch or download tiles for offline use, and review the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) before production use. Higher-volume apps should select a suitable commercial or self-hosted provider.
::

## Components

- [`<ScriptLeafletMap>`{lang="html"}](/scripts/leaflet/api/script-leaflet-map) creates the map and controls lazy loading.
- [`<ScriptLeafletTileLayer>`{lang="html"}](/scripts/leaflet/api/tile-layer) connects an explicit tile provider.
- [`<ScriptLeafletMarker>`{lang="html"}](/scripts/leaflet/api/marker) adds accessible, reactive markers.
- [`<ScriptLeafletPopup>`{lang="html"}](/scripts/leaflet/api/popup) binds slotted HTML to a marker or coordinate.
- [`<ScriptLeafletGeoJson>`{lang="html"}](/scripts/leaflet/api/geojson) renders inline GeoJSON.

## Accessibility

Interactive maps retain Leaflet's keyboard controls. Give the map a useful `aria-label` and each marker a unique `alt`. For a purely decorative map, set `:interactive="false"`; the component disables input, marks the map hidden from assistive technology, and makes its descendants inert.

## Custom styles

Nuxt Scripts injects the default stylesheet only when the SDK begins loading. If your app already supplies Leaflet CSS, disable the embedded copy:

```vue
<ScriptLeafletMap :center="center" :inject-styles="false" />
```

With strict inline-style CSP rules, use `inject-styles="false"` and load your allowed stylesheet through Nuxt's `css` configuration.
