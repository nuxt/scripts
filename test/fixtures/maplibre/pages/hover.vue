<script setup lang="ts">
import type { ScriptMapLibreGeoJsonLayer, ScriptMapLibreMapExpose } from '@nuxt/scripts'
import type { MapLayerMouseEvent, Map as MapLibreMap } from 'maplibre-gl'
import { nextTick, reactive, shallowRef } from 'vue'

const style = blankStyle('#ffffff')

// At zoom 4 one degree is about 23 pixels. The sites sit 27 pixels from the
// cluster, and the circles overlap, so the pointer slides from one to the next.
const data = points([
  { id: 1, name: 'west', kind: 'site', position: [-1.2, 0] },
  { id: 2, name: 'cluster', kind: 'cluster', position: [0, 0] },
  { id: 3, name: 'east', kind: 'site', position: [1.2, 0] },
])

const layers: ScriptMapLibreGeoJsonLayer[] = [
  { id: 'clusters', type: 'circle', filter: ['==', ['get', 'kind'], 'cluster'], paint: { 'circle-radius': 20, 'circle-color': '#dc2626' } },
  { id: 'sites', type: 'circle', filter: ['==', ['get', 'kind'], 'site'], paint: { 'circle-radius': 12, 'circle-color': '#2563eb' } },
]

const map = shallowRef<MapLibreMap>()
const hovered = shallowRef<string | null>(null)
const log = reactive({ mouseenter: 0, mouseleave: 0, dblclick: 0 })

function onReady(payload: ScriptMapLibreMapExpose): void {
  map.value = payload.map.value
  exposeMap(payload.map.value)
  ;(window as any).__ready = true
}

function onMove(event: MapLayerMouseEvent): void {
  hovered.value = String(event.features?.[0]?.properties.name ?? '')
}

function onLeave(): void {
  log.mouseleave++
  hovered.value = null
}

function onDoubleClick(event: MapLayerMouseEvent): void {
  log.dblclick++
  const feature = event.features?.[0]
  if (feature?.geometry.type !== 'Point')
    return
  const center = feature.geometry.coordinates as [number, number]
  // Stop the default zoom, then start the camera move after MapLibre's handler returns.
  event.preventDefault()
  void nextTick(() => map.value?.easeTo({ center, zoom: 6, duration: 200 }))
}
</script>

<template>
  <div>
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="style"
      :center="[0, 0]"
      :zoom="4"
      :width="400"
      :height="300"
      @ready="onReady"
    >
      <ScriptMapLibreGeoJson
        source-id="points"
        :data="data"
        :layers="layers"
        cursor="pointer"
        @mouseenter="log.mouseenter++"
        @mousemove="onMove"
        @mouseleave="onLeave"
        @dblclick="onDoubleClick"
      />
    </ScriptMapLibreMap>
    <output id="hovered">{{ hovered ?? 'none' }}</output>
    <pre id="log">{{ JSON.stringify(log) }}</pre>
  </div>
</template>
