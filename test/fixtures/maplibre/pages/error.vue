<script setup lang="ts">
import type { ScriptMapLibreGeoJsonLayer, ScriptMapLibreMapExpose } from '@nuxt/scripts'
import { computed, reactive, shallowRef } from 'vue'

const style = blankStyle('#ffffff')
const data = points([{ id: 1, name: 'one', kind: 'site', position: [0, 0] }])

// MapLibre validates this paint value, skips the layer and fires a map error.
// It does not throw.
const brokenLayers = [
  { id: 'broken', type: 'circle', paint: { 'circle-color': ['not-an-operator'] } },
] as unknown as ScriptMapLibreGeoJsonLayer[]

const validColor = shallowRef<unknown>('#0000ff')
const validLayers = computed(() => [
  { id: 'valid', type: 'circle', paint: { 'circle-color': validColor.value } },
] as unknown as ScriptMapLibreGeoJsonLayer[])

const errors = reactive({ broken: [] as string[], valid: [] as string[], map: [] as string[] })

function onReady({ map }: ScriptMapLibreMapExpose): void {
  exposeMap(map.value)
  // A layer this page adds on the raw map. Its error belongs to neither component.
  map.value?.addSource('foreign', { type: 'geojson', data })
  map.value?.addLayer({ id: 'foreign', type: 'circle', source: 'foreign', paint: { 'circle-color': ['foreign-operator'] as never } })
  ;(window as any).__ready = true
}

function breakValidLayer(): void {
  validColor.value = ['also-not-an-operator']
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
      @error="error => errors.map.push(error.message)"
    >
      <ScriptMapLibreGeoJson
        source-id="broken-source"
        :data="data"
        :layers="brokenLayers"
        @error="error => errors.broken.push(error.message)"
      />
      <ScriptMapLibreGeoJson
        source-id="valid-source"
        :data="data"
        :layers="validLayers"
        @error="error => errors.valid.push(error.message)"
      />
    </ScriptMapLibreMap>
    <button id="break-valid" type="button" @click="breakValidLayer">
      Break the valid layer
    </button>
    <pre id="errors">{{ JSON.stringify(errors) }}</pre>
  </div>
</template>
