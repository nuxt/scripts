<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * The GeoJSON source. Can be a URL string or a GeoJSON object.
   * @see https://developers.google.com/maps/documentation/javascript/datalayer#load_geojson
   */
  src: string | object
  /**
   * Styling options or a function that computes styles per feature.
   * @see https://developers.google.com/maps/documentation/javascript/datalayer#style_geojson_data
   */
  style?: google.maps.Data.StylingFunction | google.maps.Data.StyleOptions
}>()

const emit = defineEmits<{
  /**
   * Fired when a feature in the data layer is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/data#Data.click
   */
  click: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when the DOM contextmenu event is fired on a feature.
   */
  contextmenu: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when a feature is double clicked.
   */
  dblclick: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when the DOM mousedown event is fired on a feature.
   */
  mousedown: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when the DOM mousemove event is fired on a feature.
   */
  mousemove: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when the mouse leaves the area of a feature.
   */
  mouseout: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when the mouse enters the area of a feature.
   */
  mouseover: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when the DOM mouseup event is fired on a feature.
   */
  mouseup: [payload: google.maps.Data.MouseEvent]
  /**
   * Fired when a feature is added to the data layer.
   * @see https://developers.google.com/maps/documentation/javascript/reference/data#Data.addfeature
   */
  addfeature: [payload: google.maps.Data.AddFeatureEvent]
  /**
   * Fired when a feature is removed from the data layer.
   * @see https://developers.google.com/maps/documentation/javascript/reference/data#Data.removefeature
   */
  removefeature: [payload: google.maps.Data.RemoveFeatureEvent]
  /**
   * Fired when a feature's geometry is set.
   * @see https://developers.google.com/maps/documentation/javascript/reference/data#Data.setgeometry
   */
  setgeometry: [payload: google.maps.Data.SetGeometryEvent]
  /**
   * Fired when a feature's property is set.
   * @see https://developers.google.com/maps/documentation/javascript/reference/data#Data.setproperty
   */
  setproperty: [payload: google.maps.Data.SetPropertyEvent]
  /**
   * Fired when a feature's property is removed.
   * @see https://developers.google.com/maps/documentation/javascript/reference/data#Data.removeproperty
   */
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
