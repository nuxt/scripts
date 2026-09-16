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
    <ScriptMapLibreMap
      trigger="immediate"
      :map-style="style"
      :center="[0, 0]"
      :width="400"
      :height="300"
      :options="{ maplibreLogo: true, logoPosition: 'bottom-right' }"
      @ready="onReady"
    />
  </div>
</template>
