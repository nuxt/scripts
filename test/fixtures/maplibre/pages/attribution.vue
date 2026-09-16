<script setup lang="ts">
import type { ScriptMapLibreMapExpose } from '@nuxt/scripts'
import type { StyleSpecification } from 'maplibre-gl'
import { shallowRef } from 'vue'

// An inline GeoJSON source with its own credit, so the source attribution
// renders without a network request.
const style: StyleSpecification = {
  ...blankStyle('#ffffff'),
  sources: {
    points: {
      type: 'geojson',
      attribution: 'Source credits',
      data: points([{ id: 1, name: 'one', kind: 'site', position: [0, 0] }]),
    },
  },
  layers: [
    ...blankStyle('#ffffff').layers,
    { id: 'sites', type: 'circle', source: 'points', paint: { 'circle-radius': 6 } },
  ],
}

const showControl = shallowRef(true)

function onReady({ map }: ScriptMapLibreMapExpose): void {
  exposeMap(map.value)
  ;(window as any).__ready = true
}
</script>

<template>
  <div>
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="style"
      :center="[0, 0]"
      :width="400"
      :height="300"
      :options="{ attributionControl: { compact: false, customAttribution: 'Map credits' } }"
      @ready="onReady"
    >
      <ScriptMapLibreAttributionControl v-if="showControl" position="bottom-left" :options="{ compact: false }" />
    </ScriptMapLibreMap>
    <button id="toggle-control" type="button" @click="showControl = !showControl">
      Toggle attribution control
    </button>
  </div>
</template>
