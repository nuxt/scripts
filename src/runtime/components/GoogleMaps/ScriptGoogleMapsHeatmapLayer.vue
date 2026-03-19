<script setup lang="ts">
import { watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.visualization.HeatmapLayerOptions, 'map'>
}>()

const heatmapLayer = useGoogleMapsResource<google.maps.visualization.HeatmapLayer>({
  async create({ mapsApi, map }) {
    await mapsApi.importLibrary('visualization')
    return new mapsApi.visualization.HeatmapLayer({
      map,
      ...props.options,
    })
  },
  cleanup(layer) {
    layer.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (heatmapLayer.value && options) {
    heatmapLayer.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
