<script setup lang="ts">
import type { GeoJsonObject } from 'geojson'
import type * as Leaflet from 'leaflet'
import { watch } from 'vue'
import { bindLeafletEvents, useLeafletResource } from './useLeafletResource'

interface ScriptLeafletGeoJsonEmits {
  click: [event: Leaflet.LeafletMouseEvent]
  dblclick: [event: Leaflet.LeafletMouseEvent]
  mousedown: [event: Leaflet.LeafletMouseEvent]
  mouseover: [event: Leaflet.LeafletMouseEvent]
  mouseout: [event: Leaflet.LeafletMouseEvent]
  contextmenu: [event: Leaflet.LeafletMouseEvent]
  layeradd: [event: Leaflet.LayerEvent]
  layerremove: [event: Leaflet.LayerEvent]
}

const props = defineProps<{
  /** GeoJSON object, feature, or feature collection. Replace it to update the layer. */
  data: GeoJsonObject | GeoJsonObject[]
  /** Options passed to `L.geoJSON`. */
  options?: Leaflet.GeoJSONOptions
}>()

const emit = defineEmits<ScriptLeafletGeoJsonEmits>()

const geoJsonEvents = ['click', 'dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu', 'layeradd', 'layerremove'] as const

const geoJson = useLeafletResource<Leaflet.GeoJSON>({
  create({ leaflet, map }) {
    const layer = leaflet.geoJSON(props.data, props.options)
    bindLeafletEvents<ScriptLeafletGeoJsonEmits>(layer, emit, geoJsonEvents)
    return layer.addTo(map)
  },
  cleanup(layer) {
    layer.off()
    layer.remove()
  },
})

watch(() => props.data, (data) => {
  if (!geoJson.value)
    return
  geoJson.value.clearLayers()
  if (Array.isArray(data))
    data.forEach(item => geoJson.value!.addData(item))
  else
    geoJson.value.addData(data)
})

watch(() => props.options?.style, (style) => {
  if (!geoJson.value)
    return
  if (style)
    geoJson.value.setStyle(style)
  else
    geoJson.value.resetStyle()
}, { deep: 2 })

defineExpose({ geoJson })
</script>

<template>
</template>
