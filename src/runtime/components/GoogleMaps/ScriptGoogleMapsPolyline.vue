<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * Configuration options for the polyline overlay.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#PolylineOptions
   */
  options?: Omit<google.maps.PolylineOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when the polyline is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Polyline.click
   */
  click: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM contextmenu event is fired on the polyline.
   */
  contextmenu: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the polyline is double clicked.
   */
  dblclick: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM mousedown event is fired on the polyline.
   */
  mousedown: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM mousemove event is fired on the polyline.
   */
  mousemove: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the mouse leaves the area of the polyline.
   */
  mouseout: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the mouse enters the area of the polyline.
   */
  mouseover: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired when the DOM mouseup event is fired on the polyline.
   */
  mouseup: [payload: google.maps.PolyMouseEvent]
  /**
   * Fired repeatedly while the user drags the polyline.
   */
  drag: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user stops dragging the polyline.
   */
  dragend: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user starts dragging the polyline.
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

const polyline = useGoogleMapsResource<google.maps.Polyline>({
  create({ mapsApi, map }) {
    const p = new mapsApi.Polyline({ map, ...props.options })
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
  if (polyline.value && options) {
    polyline.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
