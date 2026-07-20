<script setup lang="ts">
import type * as Leaflet from 'leaflet'
import { inject, watch } from 'vue'
import { bindLeafletEvents, LEAFLET_MAP_INJECTION_KEY, useLeafletResource } from './useLeafletResource'

interface ScriptLeafletTileLayerEmits {
  loading: [event: Leaflet.LeafletEvent]
  load: [event: Leaflet.LeafletEvent]
  tileloadstart: [event: Leaflet.TileEvent]
  tileload: [event: Leaflet.TileEvent]
  tileabort: [event: Leaflet.TileEvent]
  tileerror: [event: Leaflet.TileErrorEvent]
}

const props = defineProps<{
  /** Tile URL template, for example `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. */
  url: string
  /** Tile layer options. Include the provider's required `attribution`. */
  options?: Leaflet.TileLayerOptions
}>()

const emit = defineEmits<ScriptLeafletTileLayerEmits>()

const mapContext = inject(LEAFLET_MAP_INJECTION_KEY, undefined)
const tileEvents = ['loading', 'load', 'tileloadstart', 'tileload', 'tileabort', 'tileerror'] as const

const tileLayer = useLeafletResource<Leaflet.TileLayer>({
  create({ leaflet, map }) {
    const layer = leaflet.tileLayer(props.url, props.options)
    bindLeafletEvents<ScriptLeafletTileLayerEmits>(layer, emit, tileEvents)
    return layer.addTo(map)
  },
  cleanup(layer) {
    layer.off()
    layer.remove()
  },
})

watch(() => props.url, url => tileLayer.value?.setUrl(url))
watch(() => props.options, (options) => {
  if (!tileLayer.value || !mapContext?.leaflet.value || !options)
    return
  mapContext.leaflet.value.Util.setOptions(tileLayer.value, options)
  if (options.opacity !== undefined)
    tileLayer.value.setOpacity(options.opacity)
  if (options.zIndex !== undefined)
    tileLayer.value.setZIndex(options.zIndex)
  tileLayer.value.redraw()
}, { deep: 2 })

defineExpose({ tileLayer })
</script>

<template>
</template>
