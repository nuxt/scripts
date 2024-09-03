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

Nuxt Scripts provides a `useScriptGoogleMaps` composable and a headless `ScriptGoogleMaps` component to interact with the Google Maps.

## ScriptGoogleMaps

The `ScriptGoogleMaps` component is a wrapper around the `useScriptGoogleMaps` composable. It provides a simple way to embed Google Maps in your Nuxt app.

It's optimized for performance by leveraging the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading the Google Maps when specific elements events happen.

Before Google Maps is loaded, it shows a placeholder using [Maps Static API](https://developers.google.com/maps/documentation/maps-static).

By default, it will load on the `mouseover` and `mouseclick` events.

### Billing & Permissions

::callout
You'll need an API key with permissions to access the [Static Maps API](https://developers.google.com/maps/documentation/maps-static/cloud-setup), the [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/cloud-setup) and [Places API](https://developers.google.com/maps/documentation/places/web-service/cloud-setup).
::

Showing an interactive JS map requires the Maps JavaScript API, which is a paid service. If a user interacts with the map, the following costs will be incurred:
- $7 per 1000 loads for the Maps JavaScript API (default for using Google Maps)
- $2 per 1000 loads for the Static Maps API - You can avoid providing a `placeholder` slot.
- $5 per 1000 loads for the Geocoding API - You can avoid this by providing a `google.maps.LatLng` object instead of a string for the `center` prop

However, if the user never engages with the map, only the Static Maps API usage ($2 per 1000 loads) will be charged.

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
  lat:  -37.7995487,
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
    <UButton @click="addMarker" type="button" class="">
      Add Marker
    </UButton>
    <UButton v-if="markers.length" @click="removeMarkers" type="button" color="gray" variant="ghost" class="">
      Remove Markers
    </UButton>
  </div>
</div>
</template>
```

::

### Props

The `ScriptGoogleMaps` component accepts the following props:

**Map**

- `center`: Where to center the map. You can provide a string with the location or use a `{ lat: 0, lng: 0 }` object.
- `apiKey`: The Google Maps API key. Must have access to the Static Maps API as well. You can optionally provide this as runtime config using the `public.scripts.googleMaps.apiKey` key.
- `centerMarker`: Whether to display a marker at the center position. Default is `true`.
- `mapOptions`: Options for the map. See [MapOptions](https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions).

**Placeholder**

You can customize the placeholder image using the following props, alternatively, you can use the `#placeholder` slot to customize the placeholder image.

- `placeholderOptions`: Customize the placeholder image attributes. See [Static Maps API](https://developers.google.com/maps/documentation/maps-static/start).
- `placeholderAttrs`: Customize the placeholder image attributes.

**Sizing**

If you want to render a map larger than 640x640 you should provide your own placeholder as the [Static Maps API](https://developers.google.com/maps/documentation/maps-static/start)
does not support rendering maps larger than this.

- `width`: The width of the map. Default is `640`.
- `height`: The height of the map. Default is `400`.

**Optimizations**

- `trigger`: The trigger event to load the Google Maps. Default is `mouseover`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.
- `aboveTheFold`: Optimizes the placeholder image for above-the-fold content. Default is `false`.

**Markers**

You can add markers to the static and interactive map by providing an array of `MarkerOptions`. See [MarkerOptions](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions).

- `markers`: An array of markers to display on the map.

See the [markers](https://github.com/nuxt/scripts/blob/main/playground/pages/third-parties/google-maps/markers.vue) example for more information.

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
onMounted(async () => {
  const api = googleMapsRef.value
  
  // Access internal APIs
  const googleMaps = api.googleMaps.value // google.maps api
  const mapInstance = api.map.value // google.maps.Map instance
  
  // Convert a query to lat/lng
  const query = await api.resolveQueryToLatLang('Space Needle, Seattle, WA') // { lat: 0, lng: 0 }
  
  // Import a Google Maps library
  const geometry = await api.importLibrary('geometry')
  const distance = new googleMaps.geometry.spherical.computeDistanceBetween(
    new googleMaps.LatLng(0, 0),
    new googleMaps.LatLng(0, 0)
  )
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
<ScriptGoogleMaps trigger="immediate">
</ScriptGoogleMaps>
</template>
```

#### Map Styling

You can style the map by using the `mapOptions.styles` prop. You can find pre-made styles on [Snazzy Maps](https://snazzymaps.com/).

This will automatically work for both the static map placeholder and the interactive map.

```vue
<script setup lang="ts">
const mapOptions = {
  styles: [{ elementType: 'labels', stylers: [{ visibility: 'off' }, { color: '#f49f53' }] }, { featureType: 'landscape', stylers: [{ color: '#f9ddc5' }, { lightness: -7 }] }, { featureType: 'road', stylers: [{ color: '#813033' }, { lightness: 43 }] }, { featureType: 'poi.business', stylers: [{ color: '#645c20' }, { lightness: 38 }] }, { featureType: 'water', stylers: [{ color: '#1994bf' }, { saturation: -69 }, { gamma: 0.99 }, { lightness: 43 }] }, { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f19f53' }, { weight: 1.3 }, { visibility: 'on' }, { lightness: 16 }] }, { featureType: 'poi.business' }, { featureType: 'poi.park', stylers: [{ color: '#645c20' }, { lightness: 39 }] }, { featureType: 'poi.school', stylers: [{ color: '#a95521' }, { lightness: 35 }] }, {}, { featureType: 'poi.medical', elementType: 'geometry.fill', stylers: [{ color: '#813033' }, { lightness: 38 }, { visibility: 'off' }] },
}
</script>
<template>
<ScriptGoogleMaps :mapOptions="mapOptions" />
</template>
```

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Events

The `ScriptGoogleMaps` component emits a single `ready` event when the Google Maps is loaded.

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

The default slot is used to display content that will always be visible.

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

The slot is used to display content while the Google Maps is loading.

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

The slot is used to display content while the Google Maps is loading.

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

The slot is used to display a placeholder image before the Google Maps is loaded. By default, this will show the Google Maps Static API image for the map. 

By providing your own placeholder slot you will disable the default placeholder image from being used and will not be charged for the Static Maps API usage.

```vue
<template>
  <ScriptGoogleMaps>
    <template #placeholder="{ placeholder }">
      <img :src="placeholder">
    </template>
  </ScriptGoogleMaps>
</template>
```

## useScriptGoogleMaps

The `useScriptGoogleMaps` composable lets you have fine-grain control over the Google Maps SDK. It provides a way to load the Google Maps SDK and interact with it programmatically.

```ts
export function useScriptGoogleMaps<T extends GoogleMapsApi>(_options?: GoogleMapsInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### GoogleMapsApi

```ts
export interface GoogleMapsApi {
  // @types/google.maps
  maps: typeof google.maps
}
```

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
    new maps.Map(map.value, {
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
