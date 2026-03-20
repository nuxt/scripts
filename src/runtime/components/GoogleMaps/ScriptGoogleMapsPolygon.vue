<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * Configuration options for the polygon overlay.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#PolygonOptions
   */
  options?: Omit<google.maps.PolygonOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when the polygon is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Polygon.click
   */
  click: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM contextmenu event is fired on the polygon.
   */
  contextmenu: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the polygon is double clicked.
   */
  dblclick: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM mousedown event is fired on the polygon.
   */
  mousedown: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM mousemove event is fired on the polygon.
   */
  mousemove: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the mouse leaves the area of the polygon.
   */
  mouseout: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the mouse enters the area of the polygon.
   */
  mouseover: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM mouseup event is fired on the polygon.
   */
  mouseup: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired repeatedly while the user drags the polygon.
   */
  drag: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user stops dragging the polygon.
   */
  dragend: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user starts dragging the polygon.
   */
  dragstart: [payload: google.maps.MapMouseEvent]
}>()

const eventsWithPolyMouseEventPayload = [
  'click',
  'contextmenu',
  'dblclick',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

const eventsWithMapMouseEventPayload = [
  'drag',
  'dragend',
  'dragstart',
] as const

const polygon = useGoogleMapsResource<google.maps.Polygon>({
  create({ mapsApi, map }) {
    const p = new mapsApi.Polygon({ map, ...props.options })
    bindGoogleMapsEvents(p, emit, {
      withPayload: [...eventsWithPolyMouseEventPayload, ...eventsWithMapMouseEventPayload],
    })
    return p
  },
  cleanup(p, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(p)
    p.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (polygon.value && options) {
    polygon.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
