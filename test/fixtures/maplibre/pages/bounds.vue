<script setup lang="ts">
import type { ScriptMapLibreMapExpose } from '@nuxt/scripts'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { reactive, shallowRef } from 'vue'

const style = blankStyle('#ffffff')

const bounds = shallowRef<[[number, number], [number, number]]>([[10, 10], [20, 20]])
const maps: Record<string, MapLibreMap | undefined> = {}
const ready = reactive({ framed: false, both: false })

function onReady(name: 'framed' | 'both', { map }: ScriptMapLibreMapExpose): void {
  maps[name] = map.value
  ready[name] = true
  ;(window as any).__maps = maps
  ;(window as any).__ready = ready.framed && ready.both
}
</script>

<template>
  <div>
    <!-- No center: bounds alone frames the camera. -->
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="style"
      :bounds="bounds"
      :fit-bounds-options="{ padding: 20 }"
      :bearing="30"
      :width="400"
      :height="300"
      @ready="payload => onReady('framed', payload)"
    />
    <!-- Both: bounds overrides the initial center and zoom. -->
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="style"
      :center="[-100, -40]"
      :zoom="2"
      :bounds="[[-20, -10], [-10, 0]]"
      :width="400"
      :height="300"
      @ready="payload => onReady('both', payload)"
    />
    <button id="move-bounds" type="button" @click="bounds = [[30, 30], [40, 40]]">
      Move the bounds
    </button>
    <button id="same-bounds" type="button" @click="bounds = [[bounds[0][0], bounds[0][1]], [bounds[1][0], bounds[1][1]]]">
      Pass the same bounds again
    </button>
  </div>
</template>
