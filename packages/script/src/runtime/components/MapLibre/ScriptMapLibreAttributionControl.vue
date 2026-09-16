<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreAttributionControlProps } from './types'
import { useMapLibreResource } from './useMapLibreResource'

const props = defineProps<ScriptMapLibreAttributionControlProps>()

/**
 * MapLibre adds its own attribution control unless the map sets
 * `attributionControl: false`. This component replaces that control, so the
 * map shows attribution once. Unmounting restores the replaced control, so
 * required attribution never disappears.
 */
let replaced: MapLibre.IControl[] = []

function restore(map: MapLibre.Map): void {
  for (const existing of replaced) {
    if (!map.hasControl(existing))
      map.addControl(existing)
  }
  replaced = []
}

const control = useMapLibreResource<MapLibre.AttributionControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.AttributionControl(props.options)
    // `_controls` is the list that `hasControl()` reads. `filter` copies it before removal.
    replaced = map._controls.filter(existing => existing instanceof maplibre.AttributionControl)
    for (const existing of replaced)
      map.removeControl(existing)
    try {
      map.addControl(instance, props.position)
    }
    catch (error) {
      restore(map)
      throw error
    }
    return instance
  },
  cleanup(instance, { map }) {
    // A removed map has already dropped every control, and adding to it throws.
    if (!map.hasControl(instance)) {
      replaced = []
      return
    }
    map.removeControl(instance)
    restore(map)
  },
})

defineExpose({ control })
</script>

<template>
  <!-- nuxt-scripts: MapLibre attribution control -->
</template>
