<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  src: string | object
  style?: google.maps.Data.StylingFunction | google.maps.Data.StyleOptions
}>()

const emit = defineEmits<{
  click: [payload: google.maps.Data.MouseEvent]
  contextmenu: [payload: google.maps.Data.MouseEvent]
  dblclick: [payload: google.maps.Data.MouseEvent]
  mousedown: [payload: google.maps.Data.MouseEvent]
  mousemove: [payload: google.maps.Data.MouseEvent]
  mouseout: [payload: google.maps.Data.MouseEvent]
  mouseover: [payload: google.maps.Data.MouseEvent]
  mouseup: [payload: google.maps.Data.MouseEvent]
  addfeature: [payload: google.maps.Data.AddFeatureEvent]
  removefeature: [payload: google.maps.Data.RemoveFeatureEvent]
  setgeometry: [payload: google.maps.Data.SetGeometryEvent]
  setproperty: [payload: google.maps.Data.SetPropertyEvent]
  removeproperty: [payload: google.maps.Data.RemovePropertyEvent]
}>()

const dataEvents = [
  'click',
  'contextmenu',
  'dblclick',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

const featureEvents = [
  'addfeature',
  'removefeature',
  'setgeometry',
  'setproperty',
  'removeproperty',
] as const

function loadGeoJson(src: string | object, layer: google.maps.Data) {
  if (typeof src === 'string')
    layer.loadGeoJson(src)
  else
    layer.addGeoJson(src)
}

const dataLayer = useGoogleMapsResource<google.maps.Data>({
  create({ mapsApi, map }) {
    const layer = new mapsApi.Data({ map })

    if (props.style)
      layer.setStyle(props.style)

    loadGeoJson(props.src, layer)
    bindGoogleMapsEvents(layer, emit, { withPayload: [...dataEvents, ...featureEvents] })

    return layer
  },
  cleanup(layer, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(layer)
    layer.setMap(null)
  },
})

watch(() => props.src, (src) => {
  if (!dataLayer.value)
    return
  dataLayer.value.forEach(feature => dataLayer.value!.remove(feature))
  loadGeoJson(src, dataLayer.value)
})

watch(() => props.style, (style) => {
  if (dataLayer.value)
    dataLayer.value.setStyle(style ?? {})
}, { deep: true })
</script>

<template>
</template>
