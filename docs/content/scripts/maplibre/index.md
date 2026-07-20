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
OpenFreeMap's public instance needs no account or API key, and its MapLibre styles include the required attribution. The service has no SLA, so review the [terms](https://openfreemap.org/tos/) or self-host the [OpenFreeMap stack](https://github.com/hyperknot/openfreemap) when availability requirements demand it.
::

## Recipe: track a delivery

This example combines a GeoJSON route with a reactive courier marker. In a production app, update `center` or the marker `position` from your timer or [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) handler. MapLibre moves the marker without recreating it.

```vue
<script setup lang="ts">
import type { Feature, LineString } from 'geojson'
import type { LngLatLike } from 'maplibre-gl'

interface Checkpoint {
  label: string
  detail: string
  position: [number, number]
}

const checkpoints: Checkpoint[] = [
  {
    label: 'West Melbourne depot',
    detail: 'Parcel collected',
    position: [144.9495, -37.8101],
  },
  {
    label: 'Docklands checkpoint',
    detail: 'Courier heading east',
    position: [144.9538, -37.8151],
  },
  {
    label: 'Southbank checkpoint',
    detail: 'Final approach',
    position: [144.9632, -37.8227],
  },
  {
    label: 'Flinders Lane delivery',
    detail: 'Customer destination',
    position: [144.9687, -37.8154],
  },
]

const currentIndex = ref(0)
const center = ref<LngLatLike>(checkpoints[0]!.position)
const current = computed(() => checkpoints[currentIndex.value]!)

const route: Feature<LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: checkpoints.map(checkpoint => checkpoint.position),
  },
}

const routeLayers = [{
  id: 'delivery-route',
  type: 'line' as const,
  paint: {
    'line-color': '#2563eb',
    'line-width': 6,
  },
}]

function advanceCourier() {
  if (currentIndex.value === checkpoints.length - 1)
    return

  currentIndex.value += 1
  center.value = checkpoints[currentIndex.value]!.position
}
</script>

<template>
  <div>
    <p aria-live="polite">
      Current status: <strong>{{ current.detail }}</strong>
    </p>

    <ScriptMapLibreMap
      v-model:center="center"
      map-style="https://tiles.openfreemap.org/styles/liberty"
      :zoom="14"
      width="100%"
      :height="520"
      aria-label="Delivery route from West Melbourne to Flinders Lane"
    >
      <template #description>
        Delivery route from West Melbourne depot to Flinders Lane via Docklands and Southbank.
        The courier is currently at {{ current.label }}.
      </template>

      <template #error>
        <p role="alert">
          Live map unavailable. Follow the delivery status above instead.
        </p>
      </template>

      <ScriptMapLibreNavigationControl position="top-right" />

      <ScriptMapLibreGeoJson
        source-id="delivery-route"
        :data="route"
        :layers="routeLayers"
      />

      <ScriptMapLibreMarker
        :position="current.position"
        :aria-label="`Courier at ${current.label}`"
        title="Current courier position"
        :options="{ color: '#2563eb' }"
      />
    </ScriptMapLibreMap>

    <button
      type="button"
      :disabled="currentIndex === checkpoints.length - 1"
      @click="advanceCourier"
    >
      Advance courier
    </button>
  </div>
</template>
```

Keep order status, checkpoint names, and estimated times in normal HTML outside the canvas. The `description` slot connects the essential route summary to the map for assistive technology.

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
