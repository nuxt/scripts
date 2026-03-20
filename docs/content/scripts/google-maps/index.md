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

## Demo

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

## Quick Start

### Minimal Map

```vue
<template>
  <ScriptGoogleMaps
    :center="{ lat: -33.8688, lng: 151.2093 }"
    :zoom="12"
  />
</template>
```

### Markers with Info Windows

```vue
<template>
  <ScriptGoogleMaps :center="{ lat: -33.8688, lng: 151.2093 }" :zoom="12">
    <ScriptGoogleMapsAdvancedMarkerElement
      :position="{ lat: -33.8688, lng: 151.2093 }"
    >
      <ScriptGoogleMapsInfoWindow>
        <h3>Sydney Opera House</h3>
        <p>Iconic performing arts venue</p>
      </ScriptGoogleMapsInfoWindow>
    </ScriptGoogleMapsAdvancedMarkerElement>
  </ScriptGoogleMaps>
</template>
```

### Custom Marker Content

The `#content` slot replaces the default pin with any Vue template.

```vue
<ScriptGoogleMapsAdvancedMarkerElement :position="{ lat: -33.8688, lng: 151.2093 }">
  <template #content>
    <div style="background: #1a73e8; color: white; padding: 4px 10px; border-radius: 16px; font-weight: bold;">
      $1.2M
    </div>
  </template>
</ScriptGoogleMapsAdvancedMarkerElement>
```

### Custom Popups

`ScriptGoogleMapsOverlayView` gives full control over popup styling. Use `v-model:open` to toggle without remounting.

```vue
<script setup lang="ts">
const showPopup = ref(false)
</script>

<template>
  <ScriptGoogleMapsAdvancedMarkerElement
    :position="{ lat: -33.8688, lng: 151.2093 }"
    @click="showPopup = !showPopup"
  >
    <ScriptGoogleMapsOverlayView
      v-model:open="showPopup"
      anchor="bottom-center"
      :offset="{ x: 0, y: -50 }"
    >
      <div class="popup">
        <p>Any Vue content, fully styled</p>
        <button @click.stop="showPopup = false">
          Close
        </button>
      </div>
    </ScriptGoogleMapsOverlayView>
  </ScriptGoogleMapsAdvancedMarkerElement>
</template>
```
