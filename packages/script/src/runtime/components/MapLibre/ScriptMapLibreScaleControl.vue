<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreScaleControlProps } from './types'
import { watch } from 'vue'
import { useMapLibreResource } from './useMapLibreResource'

const props = defineProps<ScriptMapLibreScaleControlProps>()

const control = useMapLibreResource<MapLibre.ScaleControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.ScaleControl(props.options)
    map.addControl(instance, props.position)
    return instance
  },
  cleanup(instance, { map }) {
    if (map.hasControl(instance))
      map.removeControl(instance)
  },
})

watch(() => props.options?.unit, (unit) => {
  if (control.value && unit)
    control.value.setUnit(unit)
})

defineExpose({ control })
</script>

<template>
  <!-- nuxt-scripts: MapLibre scale control -->
</template>
