<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.visualization.HeatmapLayerOptions, 'map'>
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let heatmapLayer: google.maps.visualization.HeatmapLayer | undefined = undefined

whenever(() => mapContext?.map.value && mapContext.mapsApi.value, async () => {
  await mapContext!.mapsApi.value!.importLibrary('visualization')

  heatmapLayer = new mapContext!.mapsApi.value!.visualization.HeatmapLayer({
    map: mapContext!.map.value!,
    ...props.options,
  })

  whenever(() => props.options, (options) => {
    heatmapLayer?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  heatmapLayer?.setMap(null)
})
</script>
