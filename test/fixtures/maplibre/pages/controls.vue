<script setup lang="ts">
import type { ScriptMapLibreMapExpose } from '@nuxt/scripts'

const style = blankStyle('#ffffff')

function onReady({ map }: ScriptMapLibreMapExpose): void {
  exposeMap(map.value)
  ;(window as any).__ready = true
}
</script>

<template>
  <div>
    <!-- production-build-probe: a production compile strips this comment -->
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="style"
      :center="[0, 0]"
      :width="400"
      :height="300"
      aria-label="Controls map"
      @ready="onReady"
    >
      <ScriptMapLibreNavigationControl position="top-right" />
      <ScriptMapLibreScaleControl position="bottom-left" />
      <ScriptMapLibreGeolocateControl position="top-left" />
      <ScriptMapLibreFullscreenControl position="top-left" />
      <ScriptMapLibreAttributionControl position="bottom-left" :options="{ customAttribution: 'Fixture credits' }" />
    </ScriptMapLibreMap>
  </div>
</template>
