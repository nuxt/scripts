<script setup lang="ts">
import type { ScriptMapLibreGeoJsonLayer } from '@nuxt/scripts'
import type { StyleSpecification } from 'maplibre-gl'

// No remote sources, glyphs or sprites.
const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } }],
}
const data = { type: 'FeatureCollection', features: [] } as const
const layers: ScriptMapLibreGeoJsonLayer[] = [{ id: 'points', type: 'circle' }]
</script>

<template>
  <div>
    <ScriptMapLibreMap
      :trigger="false"
      :map-style="style"
      :center="[0, 0]"
      :width="400"
      :height="300"
      aria-label="MapLibre hydration map"
    >
      <ScriptMapLibreGeoJson source-id="points" :data="data" :layers="layers" />
    </ScriptMapLibreMap>
  </div>
</template>
