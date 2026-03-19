<script setup lang="ts">
import { watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  src: string | object
  style?: google.maps.Data.StylingFunction | google.maps.Data.StyleOptions
}>()

const emit = defineEmits<{
  (event: typeof dataEvents[number], payload: google.maps.Data.MouseEvent): void
  (event: 'addfeature', payload: google.maps.Data.AddFeatureEvent): void
  (event: 'removefeature', payload: google.maps.Data.RemoveFeatureEvent): void
  (event: 'setgeometry', payload: google.maps.Data.SetGeometryEvent): void
  (event: 'setproperty', payload: google.maps.Data.SetPropertyEvent): void
  (event: 'removeproperty', payload: google.maps.Data.RemovePropertyEvent): void
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
    setupEventListeners(layer)

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

function setupEventListeners(layer: google.maps.Data) {
  dataEvents.forEach((event) => {
    layer.addListener(event, (payload: google.maps.Data.MouseEvent) => emit(event, payload))
  })
  featureEvents.forEach((event) => {
    layer.addListener(event, (payload: any) => (emit as any)(event, payload))
  })
}
</script>

<template>
</template>
