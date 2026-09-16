<script setup lang="ts">
import type { ScriptMapLibreGeoJsonEmits, ScriptMapLibreGeoJsonLayer, ScriptMapLibreMapExpose } from '@nuxt/scripts'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { reactive, shallowRef } from 'vue'

const SELECTED_ID = 2

// A paint change is applied as a style diff. A layer metadata change cannot be
// diffed, so MapLibre reloads the whole style.
const styles = {
  initial: blankStyle('#ffffff'),
  diff: blankStyle('#eeeeee'),
  full: blankStyle('#dddddd', { variant: 'full' }),
}

const mapStyle = shallowRef(styles.initial)
const data = points([
  { id: 1, name: 'one', kind: 'site', position: [-1, 0] },
  { id: 2, name: 'two', kind: 'site', position: [1, 0] },
])
const layers: ScriptMapLibreGeoJsonLayer[] = [{
  id: 'sites',
  type: 'circle',
  paint: {
    'circle-radius': 10,
    'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#dc2626', '#2563eb'],
  },
}]

const map = shallowRef<MapLibreMap>()
const log = reactive({
  styleload: [] as boolean[],
  sourceready: [] as string[],
})

function onReady(payload: ScriptMapLibreMapExpose): void {
  map.value = payload.map.value
  exposeMap(payload.map.value)
  ;(window as any).__ready = true
}

/** `styleload` runs before the GeoJSON component re-adds its source. */
function onStyleLoad(): void {
  log.styleload.push(Boolean(map.value?.getSource('points')))
}

function onSourceReady({ map, sourceId }: ScriptMapLibreGeoJsonEmits['sourceready'][0]): void {
  map.setFeatureState({ source: sourceId, id: SELECTED_ID }, { selected: true })
  log.sourceready.push(JSON.stringify(map.getFeatureState({ source: sourceId, id: SELECTED_ID })))
}
</script>

<template>
  <div>
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="mapStyle"
      :center="[0, 0]"
      :zoom="4"
      :width="400"
      :height="300"
      @ready="onReady"
      @styleload="onStyleLoad"
    >
      <ScriptMapLibreGeoJson
        source-id="points"
        :data="data"
        :layers="layers"
        @sourceready="onSourceReady"
      />
    </ScriptMapLibreMap>
    <button id="swap-diff" type="button" @click="mapStyle = styles.diff">
      Swap by diff
    </button>
    <button id="swap-full" type="button" @click="mapStyle = styles.full">
      Swap by full reload
    </button>
    <pre id="log">{{ JSON.stringify(log) }}</pre>
  </div>
</template>
