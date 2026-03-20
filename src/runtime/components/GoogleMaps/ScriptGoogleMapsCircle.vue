<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * Configuration options for the circle overlay.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#CircleOptions
   */
  options?: Omit<google.maps.CircleOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when the circle's center is changed.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.center_changed
   */
  center_changed: []
  /**
   * Fired when the circle's radius is changed.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.radius_changed
   */
  radius_changed: []
  /**
   * Fired when the circle is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.click
   */
  click: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the circle is double clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.dblclick
   */
  dblclick: [payload: google.maps.MapMouseEvent]
  /**
   * Fired repeatedly while the user drags the circle.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.drag
   */
  drag: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user stops dragging the circle.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.dragend
   */
  dragend: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user starts dragging the circle.
   * @see https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle.dragstart
   */
  dragstart: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mousedown event is fired on the circle.
   */
  mousedown: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mousemove event is fired on the circle.
   */
  mousemove: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the mouse leaves the area of the circle.
   */
  mouseout: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the mouse enters the area of the circle.
   */
  mouseover: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mouseup event is fired on the circle.
   */
  mouseup: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the circle is right clicked.
   */
  rightclick: [payload: google.maps.MapMouseEvent]
}>()

const eventsWithoutPayload = [
  'center_changed',
  'radius_changed',
] as const

const eventsWithMapMouseEventPayload = [
  'click',
  'dblclick',
  'drag',
  'dragend',
  'dragstart',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'rightclick',
] as const

const circle = useGoogleMapsResource<google.maps.Circle>({
  create({ mapsApi, map }) {
    const c = new mapsApi.Circle({ map, ...props.options })
    bindGoogleMapsEvents(c, emit, {
      noPayload: eventsWithoutPayload,
      withPayload: eventsWithMapMouseEventPayload,
    })
    return c
  },
  cleanup(c, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(c)
    c.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (circle.value && options) {
    circle.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
