<script setup lang="ts">
import { watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * Configuration options for the heatmap layer visualization.
   * @deprecated Google deprecated the Maps JavaScript API `HeatmapLayer` (May 2025) and removed it in v3.65 (May 2026). Consider [deck.gl HeatmapLayer](https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer) instead.
   * @see https://developers.google.com/maps/documentation/javascript/reference/visualization#HeatmapLayerOptions
   */
  options?: Omit<HeatmapLayerOptions, 'map'>
}>()

if (import.meta.dev) {
  console.warn(
    '[nuxt-scripts] <ScriptGoogleMapsHeatmapLayer> is deprecated. '
    + 'Google deprecated the Maps JavaScript API HeatmapLayer (May 2025) and removed it in v3.65 (May 2026). '
    + 'Consider deck.gl HeatmapLayer instead: https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer',
  )
}

/**
 * Configuration options for the heatmap layer visualization.
 *
 * The `HeatmapLayer` types were removed from `@types/google.maps` in v3.65 as part of Google's
 * deprecation (the runtime feature is still available until May 2026), so we type the surface locally.
 * @see https://developers.google.com/maps/documentation/javascript/reference/visualization#HeatmapLayerOptions
 */
interface HeatmapLayerOptions {
  data?: unknown
  dissipating?: boolean
  gradient?: string[]
  map?: google.maps.Map
  maxIntensity?: number
  opacity?: number
  radius?: number
}
interface HeatmapLayer {
  setMap: (map: google.maps.Map | null) => void
  setOptions: (options: HeatmapLayerOptions) => void
}

const heatmapLayer = useGoogleMapsResource<HeatmapLayer>({
  async create({ mapsApi, map }) {
    await mapsApi.importLibrary('visualization')
    const Layer = mapsApi.visualization.HeatmapLayer as unknown as new (opts: HeatmapLayerOptions) => HeatmapLayer
    return new Layer({
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
