<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents, useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * Configuration options for the rectangle overlay.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#RectangleOptions
   */
  options?: Omit<google.maps.RectangleOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when the rectangle's bounds are changed.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Rectangle.bounds_changed
   */
  bounds_changed: []
  /**
   * Fired when the rectangle is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Rectangle.click
   */
  click: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM contextmenu event is fired on the rectangle.
   */
  contextmenu: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the rectangle is double clicked.
   */
  dblclick: [payload: google.maps.MapMouseEvent]
  /**
   * Fired repeatedly while the user drags the rectangle.
   */
  drag: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user stops dragging the rectangle.
   */
  dragend: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user starts dragging the rectangle.
   */
  dragstart: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mousedown event is fired on the rectangle.
   */
  mousedown: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mousemove event is fired on the rectangle.
   */
  mousemove: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the mouse leaves the area of the rectangle.
   */
  mouseout: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the mouse enters the area of the rectangle.
   */
  mouseover: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mouseup event is fired on the rectangle.
   */
  mouseup: [payload: google.maps.MapMouseEvent]
}>()

const eventsWithoutPayload = [
  'bounds_changed',
] as const

const eventsWithMapMouseEventPayload = [
  'click',
  'contextmenu',
  'dblclick',
  'drag',
  'dragend',
  'dragstart',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

const rectangle = useGoogleMapsResource<google.maps.Rectangle>({
  create({ mapsApi, map }) {
    const r = new mapsApi.Rectangle({ map, ...props.options })
    bindGoogleMapsEvents(r, emit, {
      noPayload: eventsWithoutPayload,
      withPayload: eventsWithMapMouseEventPayload,
    })
    return r
  },
  cleanup(r, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(r)
    r.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (rectangle.value && options) {
    rectangle.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
