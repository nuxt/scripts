<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import { useMapLibreResource } from './useMapLibreResource'

const props = defineProps<{
  /** Position of the navigation control. */
  position?: MapLibre.ControlPosition
  /** Options passed to `new maplibregl.NavigationControl()`. */
  options?: MapLibre.NavigationControlOptions
}>()

const control = useMapLibreResource<MapLibre.NavigationControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.NavigationControl(props.options)
    map.addControl(instance, props.position)
    return instance
  },
  cleanup(instance, { map }) {
    if (map.hasControl(instance))
      map.removeControl(instance)
  },
})

defineExpose({ control })
</script>

<template>
</template>
