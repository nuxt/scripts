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

Nuxt Scripts provides a `useScriptGoogleMaps` composable and a headless `ScriptGoogleMaps` a component to interact with the Google Maps.

## ScriptGoogleMaps

The `ScriptGoogleMaps` component is a wrapper around the `useScriptGoogleMaps` composable. It provides a simple way to embed Google Maps in your Nuxt app.

It's optimized for performance by leveraging the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading the Google Maps when specific elements events happen.

By default, it will load on the `mouseover` event.

### Demo

::code-group

:google-maps-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
import { ref } from 'vue'

const isLoaded = ref(false)
const maps = ref()

const query = ref('Space+Needle,Seattle+WA')
</script>

<template>
  <div class="not-prose">
    <div class="flex items-center justify-center p-5">
      <ScriptGoogleMaps ref="maps" :query="query" api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU" width="600" height="400" video-id="d_IFKP1Ofq0" class="group" @ready="isLoaded = true" />
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Hover to load" description="Hover the map will load the Google Maps iframe." />
    </div>
  </div>
</template>
```

::

### Props

The `ScriptGoogleMaps` component accepts the following props:

- `trigger`: The trigger event to load the Google Maps. Default is `mouseover`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.

All script options from the Player SDK are supported, please consult the [Embed Options](https://developer.vimeo.com/player/sdk/embed)
for full documentation.

```ts
const props = defineProps<{
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  /**
   * Defines the Google Maps API key. Must have access to the Static Maps API as well.
   */
  apiKey: string
  /**
   * Defines map marker location.
   */
  query?: string
  /**
   * Options for the map.
   */
  options?: Omit<google.maps.MapOptions, 'center'>
  /**
   * Defines the width of the map.
   */
  width?: number
  /**
   * Defines the height of the map
   */
  height?: number
}>()
```

### Events

The `ScriptGoogleMaps` component emits all events from the Google Maps SDK. Please consult the [Player Events](https://developer.vimeo.com/player/sdk/reference#about-player-events) for full documentation.

### Slots

As the component is provided headless, there are a number of slots for you to customize the player however you like before it's loaded in.

**default**

The default slot is used to display content that will always be visible.

```vue
``

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
``
