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
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptGoogleMaps.vue
    size: xs

---

[Google Maps](https://maps.google.com/) allows you to embed maps in your website and customize them with your content.

Nuxt Scripts provides a [`useScriptGoogleMaps()`{lang="ts"}](/scripts/google-maps){lang="ts"} composable and a headless [`<ScriptGoogleMaps>`{lang="html"}](/scripts/google-maps){lang="html"} component to interact with the Google Maps.

::script-types
::

## Types

To use Google Maps with full TypeScript support, you will need
to install the `@types/google.maps` dependency.

```bash
pnpm add -D @types/google.maps
```

## Setup

To use the Google Maps component with server-side features (static map proxy, geocode proxy), enable it in your `nuxt.config`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleMaps: true,
    },
  },
})
```

This registers server API routes for the static maps image proxy (`/_scripts/proxy/google-static-maps`) and geocode proxy (`/_scripts/proxy/google-maps-geocode`), keeping your API key server-side.

## [`<ScriptGoogleMaps>`{lang="html"}](/scripts/google-maps){lang="html"}

The [`<ScriptGoogleMaps>`{lang="html"}](/scripts/google-maps){lang="html"} component is a wrapper around the [`useScriptGoogleMaps()`{lang="ts"}](/scripts/google-maps){lang="ts"} composable. It provides a simple way to embed Google Maps in your Nuxt app.

It's optimized for performance by using the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading the Google Maps when specific elements events happen.

Before Google Maps loads, it shows a placeholder using [Maps Static API](https://developers.google.com/maps/documentation/maps-static).

By default, it will load on the `mouseover` and `mouseclick` events.

### Billing & Permissions

::callout
You'll need an API key with permissions to access the [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/cloud-setup).

Optionally, you can provide permissions to the [Static Maps API](https://developers.google.com/maps/documentation/maps-static/cloud-setup) (required when lazy loading and using the placeholder map) and [Places API](https://developers.google.com/maps/documentation/places/web-service/cloud-setup) (required when searching using a query, i.e "New York").
::

Showing an interactive JS map requires the Maps JavaScript API, which is a paid service. If a user interacts with the map, the following costs will be incurred:
- $7 per 1000 loads for the Maps JavaScript API (default for using Google Maps)
- $2 per 1000 loads for the Static Maps API - Only used when you don't provide a `placeholder` slot.
- $5 per 1000 loads for the Geocoding API - Only used when you don't provide a `google.maps.LatLng` object instead of a query string for the `center` prop

However, if the user never engages with the map, only the Static Maps API usage ($2 per 1000 loads) will be charged, assuming you're using it.

Billing will be optimized in a [future update](https://github.com/nuxt/scripts/issues/83).

You should consider using the [Iframe Embed](https://developers.google.com/maps/documentation/embed/get-started) instead if you want to avoid these costs
and are okay with a less interactive map.

### Demo

::code-group

:google-maps-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
import { ref } from 'vue'

const isLoaded = ref(false)
const center = ref()
const maps = ref()

const query = ref({
  lat: -37.7995487,
  lng: 144.9867841,
})

const markers = ref([])

let increment = 1
function addMarker() {
  // push to markers, we want to add a marker from the center but randomize the position by a bit
  const _center = center.value || query.value
  // lat and lng may be a function
  const _lat = typeof _center.lat === 'function' ? _center.lat() : _center.lat
  const _lng = typeof _center.lng === 'function' ? _center.lng() : _center.lng
  const lat = (1000 * _lat + increment) / 1000
  const lng = (1000 * _lng + increment) / 1000
  increment += 1

  markers.value.push(`${lat},${lng}`)
}

function removeMarkers() {
  markers.value = []
  increment = 1
}
function handleReady({ map }) {
  center.value = map.value.getCenter()
  map.value.addListener('center_changed', () => {
    center.value = map.value.getCenter()
  })
  isLoaded.value = true
}
</script>

<template>
  <div class="not-prose">
    <div class="flex items-center justify-center p-5">
      <ScriptGoogleMaps
        ref="maps"
        :center="query"
        :markers="markers"
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        class="group"
        above-the-fold
        @ready="handleReady"
      />
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Static Image: Hover to load interactive" description="Hovering the map will trigger the Google Maps script to load and init the map." />
      <UAlert v-if="isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Interactive Map">
        <template #description>
          Center: {{ center }}
        </template>
      </UAlert>
      <UButton type="button" class="" @click="addMarker">
        Add Marker
      </UButton>
      <UButton v-if="markers.length" type="button" color="gray" variant="ghost" class="" @click="removeMarkers">
        Remove Markers
      </UButton>
    </div>
  </div>
</template>
```

::

#### With Environment Variables

If you prefer to configure your API key using environment variables.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleMaps: true,
    }
  },
  // you need to provide a runtime config to access the environment variables
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

### Guides

#### Eager Loading Placeholder

The Google Maps placeholder image is lazy-loaded by default. You should change this behavior if your map is above the fold
or consider using the `#placeholder` slot to customize the placeholder image.

::code-group

```vue [Placeholder Attrs]
<ScriptGoogleMaps above-the-fold />
```

```vue [Placeholder Slot]
<ScriptGoogleMaps>
  <template #placeholder="{ placeholder }">
    <img :src="placeholder" alt="Map Placeholder">
  </template>
</ScriptGoogleMaps>
```

::

#### Advanced Marker Control

If you need more control over the markers on the map, you can use the exposed `createAdvancedMapMarker` function which
will return the marker instance.

```vue
<script lang="ts" setup>
const googleMapsRef = ref()
onMounted(() => {
  const marker = googleMapsRef.value.createAdvancedMapMarker({
    position: { }
  })
})
</script>

<template>
  <ScriptGoogleMaps ref="googleMapsRef" />
</template>
```


#### Advanced Map Control

The component exposes all internal APIs, so you can customize your map as needed.

```vue
<script lang="ts" setup>
const googleMapsRef = ref()
onMounted(() => {
  const api = googleMapsRef.value

  // Access internal APIs
  const googleMaps = api.googleMaps.value // google.maps api
  const mapInstance = api.map.value // google.maps.Map instance

  // Convert a query to lat/lng
  api.resolveQueryToLatLang('Space Needle, Seattle, WA').then((query) => {
    // query = { lat: 0, lng: 0 }
  })

  // Import a Google Maps library
  api.importLibrary('geometry').then((geometry) => {
    const distance = googleMaps.geometry.spherical.computeDistanceBetween(
      new googleMaps.LatLng(0, 0),
      new googleMaps.LatLng(0, 0)
    )
  })
})
</script>

<template>
  <ScriptGoogleMaps ref="googleMapsRef" />
</template>
```

#### Loading immediately

If you want to load the Google Maps immediately, you can use the `trigger` prop.

```vue
<template>
  <ScriptGoogleMaps trigger="immediate" />
</template>
```

#### Map Styling

You can style the map by using the `mapOptions.styles` prop. You can find pre-made styles on [Snazzy Maps](https://snazzymaps.com/).

This will automatically work for both the static map placeholder and the interactive map.

```vue
<script setup lang="ts">
const mapOptions = {
  styles: [
    { elementType: 'labels', stylers: [{ visibility: 'off' }, { color: '#f49f53' }] },
    { featureType: 'landscape', stylers: [{ color: '#f9ddc5' }, { lightness: -7 }] },
    { featureType: 'road', stylers: [{ color: '#813033' }, { lightness: 43 }] },
    { featureType: 'poi.business', stylers: [{ color: '#645c20' }, { lightness: 38 }] },
    { featureType: 'water', stylers: [{ color: '#1994bf' }, { saturation: -69 }, { gamma: 0.99 }, { lightness: 43 }] },
    { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f19f53' }, { weight: 1.3 }, { visibility: 'on' }, { lightness: 16 }] },
    { featureType: 'poi.business' },
    { featureType: 'poi.park', stylers: [{ color: '#645c20' }, { lightness: 39 }] },
    { featureType: 'poi.school', stylers: [{ color: '#a95521' }, { lightness: 35 }] },
    {},
    { featureType: 'poi.medical', elementType: 'geometry.fill', stylers: [{ color: '#813033' }, { lightness: 38 }, { visibility: 'off' }] },
  ],
}
</script>

<template>
  <ScriptGoogleMaps :map-options="mapOptions" />
</template>
```

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Events

The [`<ScriptGoogleMaps>`{lang="html"}](/scripts/google-maps){lang="html"} component emits a single `ready` event when Google Maps loads.

```ts
const emits = defineEmits<{
  ready: [map: google.maps.Map]
}>()
```

To subscribe to Google Map events, you can use the `ready` event.

```vue
<script setup lang="ts">
function handleReady({ map }) {
  map.addListener('center_changed', () => {
    console.log('Center changed', map.getCenter())
  })
}
</script>

<template>
  <ScriptGoogleMaps @ready="handleReady" />
</template>
```

### Slots

The component provides minimal UI by default, only enough to be functional and accessible. There are a number of slots for you to customize the maps however you like.

**default**

The default slot displays content that will always be visible.

```vue
<template>
  <ScriptGoogleMaps>
    <div class="absolute top-0 left-0 right-0 p-5 bg-white text-black">
      <h1 class="text-xl font-bold">
        My Custom Map
      </h1>
    </div>
  </ScriptGoogleMaps>
</template>
```

**awaitingLoad**

This slot displays content while Google Maps is loading.

```vue
<template>
  <ScriptGoogleMaps>
    <template #awaitingLoad>
      <div class="bg-blue-500 text-white p-5">
        Click to load the map!
      </div>
    </template>
  </ScriptGoogleMaps>
</template>
```

**loading**

This slot displays content while Google Maps is loading.

Note: This shows a `ScriptLoadingIndicator` by default for accessibility and UX, by providing a slot you will
override this component. Make sure you provide a loading indicator.

```vue
<template>
  <ScriptGoogleMaps>
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptGoogleMaps>
</template>
```

**placeholder**

This slot displays a placeholder image before Google Maps loads. By default, this will show the Google Maps Static API image for the map.

By providing your own placeholder slot, you disable the default placeholder image and won't incur charges for the Static Maps API.

```vue
<template>
  <ScriptGoogleMaps>
    <template #placeholder="{ placeholder }">
      <img :src="placeholder">
    </template>
  </ScriptGoogleMaps>
</template>
```

## Google Maps SFC Components

Nuxt Scripts provides individual Single File Components (SFCs) for different Google Maps elements. These components allow you to declaratively compose complex maps using Vue's template syntax.

### Installation

To use marker clustering functionality, you'll need to install the required peer dependency:

```bash
npm install @googlemaps/markerclusterer
# or
yarn add @googlemaps/markerclusterer
# or
pnpm add @googlemaps/markerclusterer
```

### Available Components

All Google Maps SFC components must work within a `<ScriptGoogleMaps>`{lang="html"} component:

- `<ScriptGoogleMapsMarker>`{lang="html"} - Classic markers with icon support
- `<ScriptGoogleMapsAdvancedMarkerElement>`{lang="html"} - Modern advanced markers with HTML content
- `<ScriptGoogleMapsPinElement>`{lang="html"} - Customizable pin markers (use within AdvancedMarkerElement)
- `<ScriptGoogleMapsInfoWindow>`{lang="html"} - Information windows that appear on click
- `<ScriptGoogleMapsMarkerClusterer>`{lang="html"} - Groups nearby markers into clusters
- `<ScriptGoogleMapsCircle>`{lang="html"} - Circular overlays
- `<ScriptGoogleMapsPolygon>`{lang="html"} - Polygon shapes
- `<ScriptGoogleMapsPolyline>`{lang="html"} - Line paths
- `<ScriptGoogleMapsRectangle>`{lang="html"} - Rectangular overlays
- `<ScriptGoogleMapsHeatmapLayer>`{lang="html"} - Heatmap visualization
- `<ScriptGoogleMapsGeoJson>`{lang="html"} - GeoJSON data layers

### Basic Usage

```vue
<template>
  <ScriptGoogleMaps
    :center="{ lat: -34.397, lng: 150.644 }"
    :zoom="8"
    api-key="your-api-key"
  >
    <!-- Add markers -->
    <ScriptGoogleMapsMarker
      :options="{ position: { lat: -34.397, lng: 150.644 } }"
    >
      <!-- Info window appears on marker click -->
      <ScriptGoogleMapsInfoWindow>
        <div>
          <h3>Sydney, Australia</h3>
          <p>A great city!</p>
        </div>
      </ScriptGoogleMapsInfoWindow>
    </ScriptGoogleMapsMarker>

    <!-- Advanced marker with custom pin -->
    <ScriptGoogleMapsAdvancedMarkerElement
      :options="{ position: { lat: -34.407, lng: 150.654 } }"
    >
      <ScriptGoogleMapsPinElement
        :options="{ scale: 1.5, background: '#FF0000' }"
      />
    </ScriptGoogleMapsAdvancedMarkerElement>

    <!-- Circle overlay -->
    <ScriptGoogleMapsCircle
      :options="{
        center: { lat: -34.397, lng: 150.644 },
        radius: 1000,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
      }"
    />
  </ScriptGoogleMaps>
</template>
```

### Component Composition Patterns

**Marker Clustering**

```vue
<template>
  <ScriptGoogleMaps api-key="your-api-key">
    <ScriptGoogleMapsMarkerClusterer>
      <ScriptGoogleMapsMarker
        v-for="location in locations"
        :key="location.id"
        :options="{ position: location.position }"
      >
        <ScriptGoogleMapsInfoWindow>
          <div>{{ location.name }}</div>
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMapsMarker>
    </ScriptGoogleMapsMarkerClusterer>
  </ScriptGoogleMaps>
</template>
```

**Heatmap with Data Points**

```vue
<script setup>
const heatmapData = ref([])

onMounted(() => {
  // Populate heatmap data with google.maps.LatLng objects
})
</script>

<template>
  <ScriptGoogleMaps api-key="your-api-key">
    <ScriptGoogleMapsHeatmapLayer
      :options="{ data: heatmapData }"
    />
  </ScriptGoogleMaps>
</template>
```

**GeoJSON Data Layer**

Load GeoJSON from a URL or inline object and apply custom styling:

```vue
<script setup lang="ts">
const geoJsonStyle = {
  fillColor: '#4285F4',
  fillOpacity: 0.4,
  strokeColor: '#4285F4',
  strokeWeight: 2,
}

function handleFeatureClick(event: google.maps.Data.MouseEvent) {
  console.log('Clicked feature:', event.feature.getProperty('name'))
}
</script>

<template>
  <ScriptGoogleMaps api-key="your-api-key">
    <!-- Load from URL -->
    <ScriptGoogleMapsGeoJson
      src="https://example.com/data.geojson"
      :style="geoJsonStyle"
      @click="handleFeatureClick"
    />

    <!-- Or pass inline GeoJSON -->
    <ScriptGoogleMapsGeoJson
      :src="{
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [150.644, -34.397] },
          properties: { name: 'My Point' },
        }],
      }"
    />
  </ScriptGoogleMaps>
</template>
```

### Component Hierarchy

```text
ScriptGoogleMaps (root)
├── ScriptGoogleMapsMarkerClusterer (optional)
│   └── ScriptGoogleMapsMarker / ScriptGoogleMapsAdvancedMarkerElement
│       └── ScriptGoogleMapsInfoWindow (optional)
├── ScriptGoogleMapsAdvancedMarkerElement
│   ├── ScriptGoogleMapsPinElement (optional)
│   └── ScriptGoogleMapsInfoWindow (optional)
├── ScriptGoogleMapsGeoJson (GeoJSON data layer)
└── ScriptGoogleMapsCircle / Polygon / Polyline / Rectangle / HeatmapLayer
```

Most SFC components accept an `options` prop matching their Google Maps API options type (excluding `map`, which the parent component injects automatically). `ScriptGoogleMapsGeoJson` uses `src` and `style` props instead. Options are reactive - changes update the basic Google Maps object. Components clean up automatically on unmount.

### Component Reference

| Component | Options Type | Notes |
|---|---|---|
| `ScriptGoogleMapsMarker` | `google.maps.MarkerOptions` | Classic marker |
| `ScriptGoogleMapsAdvancedMarkerElement` | `google.maps.marker.AdvancedMarkerElementOptions` | Recommended |
| `ScriptGoogleMapsPinElement` | `google.maps.marker.PinElementOptions` | Child of AdvancedMarkerElement |
| `ScriptGoogleMapsInfoWindow` | `google.maps.InfoWindowOptions` | Auto-opens on parent marker click |
| `ScriptGoogleMapsMarkerClusterer` | `MarkerClustererOptions` | Requires `@googlemaps/markerclusterer` |
| `ScriptGoogleMapsCircle` | `google.maps.CircleOptions` | |
| `ScriptGoogleMapsPolygon` | `google.maps.PolygonOptions` | |
| `ScriptGoogleMapsPolyline` | `google.maps.PolylineOptions` | |
| `ScriptGoogleMapsRectangle` | `google.maps.RectangleOptions` | |
| `ScriptGoogleMapsHeatmapLayer` | `google.maps.visualization.HeatmapLayerOptions` | |
| `ScriptGoogleMapsGeoJson` | `src`: `string \| object`, `style`: `google.maps.Data.StylingFunction \| google.maps.Data.StyleOptions` | Emits mouse & feature events |

### `ScriptGoogleMapsGeoJson`{lang="html"}

Loads GeoJSON data onto the map using `google.maps.Data` and either `loadGeoJson` (when `src` is a URL) or `addGeoJson` (when `src` is an inline object).

#### Props

| Prop | Type | Description |
|---|---|---|
| `src` | `string \| object` | URL to load via `loadGeoJson()`{lang="ts"} or a GeoJSON object to add via `addGeoJson()`{lang="ts"}. Reactive - changing it clears existing features and loads the new data. |
| `style` | `google.maps.Data.StylingFunction \| google.maps.Data.StyleOptions` | Styling applied to the data layer. Reactive with deep watching. |

#### Events

**Mouse events**: emitted with a `google.maps.Data.MouseEvent` payload:

`click`, `contextmenu`, `dblclick`, `mousedown`, `mousemove`, `mouseout`, `mouseover`, `mouseup`

**Feature lifecycle events:**

| Event | Payload |
|---|---|
| `addfeature` | `google.maps.Data.AddFeatureEvent` |
| `removefeature` | `google.maps.Data.RemoveFeatureEvent` |
| `setgeometry` | `google.maps.Data.SetGeometryEvent` |
| `setproperty` | `google.maps.Data.SetPropertyEvent` |
| `removeproperty` | `google.maps.Data.RemovePropertyEvent` |

## [`useScriptGoogleMaps()`{lang="ts"}](/scripts/google-maps){lang="ts"}

The [`useScriptGoogleMaps()`{lang="ts"}](/scripts/google-maps){lang="ts"} composable lets you have fine-grain control over the Google Maps SDK. It provides a way to load the Google Maps SDK and interact with it programmatically.

```ts
export function useScriptGoogleMaps<T extends GoogleMapsApi>(_options?: GoogleMapsInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

## Example

Loading the Google Maps SDK and interacting with it programmatically.

```vue
<script setup lang="ts">
/// <reference types="google.maps" />
const { onLoaded } = useScriptGoogleMaps({
  apiKey: 'key'
})
const map = ref()
onMounted(() => {
  onLoaded(async (instance) => {
    const maps = await instance.maps as any as typeof google.maps // upstream google type issue
    const _map = new maps.Map(map.value, {
      center: { lat: -34.397, lng: 150.644 },
      zoom: 8
    })
    // Do something with the map
  })
})
</script>

<template>
  <div ref="map" />
</template>
```
