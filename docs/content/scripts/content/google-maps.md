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
You'll need an API key with permissions to access the [Static Maps API](https://developers.google.com/maps/documentation/maps-static/cloud-setup) and the [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/cloud-setup).
::

Showing an interactive JS map requires the Maps JavaScript API, which is a paid service. If a user interacts with the map, the following costs will be incurred:
- $7 per 1000 loads for the Maps JavaScript API (default for using Google Maps)
- $5 per 1000 loads for the Geocoding API
- $2 per 1000 loads for the Static Maps API

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
import type { Ref } from 'vue'

const isLoaded = ref(false)
const center = ref()
const maps = ref()

const query = ref('Space+Needle,Seattle+WA')
function handleReady(_map: Ref<google.maps.Map>) {
  const map = _map.value
  center.value = map.getCenter()
  map.addListener('center_changed', () => {
    center.value = map.getCenter()
  })
  isLoaded.value = true
}
</script>

<template>
  <div class="not-prose">
    <div class="flex items-center justify-center p-5">
      <ScriptGoogleMaps
        ref="maps"
        :query="query"
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        width="600"
        height="400"
        class="group"
        @ready="handleReady"
      />
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Hover to load" description="Hover the map will load the Google Maps iframe." />
      <UAlert v-if="isLoaded" class="mb-5" size="sm" color="blue" variant="soft">
        <template #title>
          Center: {{ center }}
        </template>
      </UAlert>
    </div>
  </div>
</template>
```

::

### Props

The `ScriptGoogleMaps` component accepts the following props:

- `trigger`: The trigger event to load the Google Maps. Default is `mouseover`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.
- `aboveTheFold`: Optimizes the placeholder image for above-the-fold content. Default is `false`.
- `apiKey`: The Google Maps API key. Must have access to the Static Maps API as well. You can optionally provide this as runtime config using the `public.scripts.googleMaps.apiKey` key.
- `query`: Map marker location. You can provide a string with the location or use the `google.maps.LatLng` object.
- `options`: Options for the map. See [MapOptions](https://developers.google.com/maps/documentation/javascript/reference/map#MapOptions).
- `width`: The width of the map. Default is `600`.
- `height`: The height of the map. Default is `400`.
- `placeholderOptions`: Customize the placeholder image attributes. See [Static Maps API](https://developers.google.com/maps/documentation/maps-static/start).
- `placeholderAttrs`: Customize the placeholder image attributes.

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

### Events

The `ScriptGoogleMaps` component emits a single `ready` event when the Google Maps is loaded.

```ts
const emits = defineEmits<{
  ready: [map: google.maps.Map]
}>()
```

To subscribe to Google Map events, you can use the `ready` event.

```vue
<script setup>
function handleReady(map) {
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

The slot is used to display a placeholder image before the Google Maps is loaded. By default, this will show the Google Maps Static API image for the map. You can display it however you like.

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
<script setup>
const { $script } = useScriptGoogleMaps({
  apiKey: 'key'
})
$script.then(({ maps }) => {
  const map = new maps.Map(document.getElementById('map'), {
    center: { lat: -34.397, lng: 150.644 },
    zoom: 8
  })
})
</script>
```
