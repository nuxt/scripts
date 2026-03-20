<script lang="ts">
import { inject, provide, watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { MARKER_INJECTION_KEY } from './injectionKeys'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

export { MARKER_INJECTION_KEY } from './injectionKeys'
</script>

<script setup lang="ts">
const props = defineProps<{
  /**
   * The position of the marker on the map.
   * @see https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions.position
   */
  position?: google.maps.LatLngLiteral | google.maps.LatLng
  /**
   * Configuration options for the legacy marker. Deprecated: use ScriptGoogleMapsAdvancedMarkerElement instead.
   * @see https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions
   */
  options?: Omit<google.maps.MarkerOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when the marker's animation property changes.
   */
  animation_changed: []
  /**
   * Fired when the marker's clickable property changes.
   */
  clickable_changed: []
  /**
   * Fired when the marker's cursor property changes.
   */
  cursor_changed: []
  /**
   * Fired when the marker's draggable property changes.
   */
  draggable_changed: []
  /**
   * Fired when the marker's flat property changes.
   */
  flat_changed: []
  /**
   * Fired when the marker's icon property changes.
   */
  icon_changed: []
  /**
   * Fired when the marker's position property changes.
   */
  position_changed: []
  /**
   * Fired when the marker's shape property changes.
   */
  shape_changed: []
  /**
   * Fired when the marker's title property changes.
   */
  title_changed: []
  /**
   * Fired when the marker's visible property changes.
   */
  visible_changed: []
  /**
   * Fired when the marker's zIndex property changes.
   */
  zindex_changed: []
  /**
   * Fired when the marker is clicked.
   */
  click: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM contextmenu event is fired on the marker.
   */
  contextmenu: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the marker is double clicked.
   */
  dblclick: [payload: google.maps.MapMouseEvent]
  /**
   * Fired repeatedly while the user drags the marker.
   */
  drag: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user stops dragging the marker.
   */
  dragend: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user starts dragging the marker.
   */
  dragstart: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mousedown event is fired on the marker.
   */
  mousedown: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the mouse leaves the area of the marker.
   */
  mouseout: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the mouse enters the area of the marker.
   */
  mouseover: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the DOM mouseup event is fired on the marker.
   */
  mouseup: [payload: google.maps.MapMouseEvent]
}>()

if (import.meta.dev) {
  console.warn('[nuxt-scripts] ScriptGoogleMapsMarker uses the deprecated google.maps.Marker class. Use ScriptGoogleMapsAdvancedMarkerElement instead.')
}

const eventsWithoutPayload = [
  'animation_changed',
  'clickable_changed',
  'cursor_changed',
  'draggable_changed',
  'flat_changed',
  'icon_changed',
  'position_changed',
  'shape_changed',
  'title_changed',
  'visible_changed',
  'zindex_changed',
] as const

const eventsWithMapMouseEventPayload = [
  'click',
  'contextmenu',
  'dblclick',
  'drag',
  'dragend',
  'dragstart',
  'mousedown',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

const marker = useGoogleMapsResource<google.maps.Marker>({
  create({ mapsApi, map }) {
    const m = new mapsApi.Marker({
      ...props.options,
      ...(props.position ? { position: props.position } : {}),
    })
    bindGoogleMapsEvents(m, emit, {
      noPayload: eventsWithoutPayload,
      withPayload: eventsWithMapMouseEventPayload,
    })
    if (markerClustererContext?.markerClusterer.value) {
      markerClustererContext.markerClusterer.value.addMarker(m, true)
      markerClustererContext.requestRerender()
    }
    else {
      m.setMap(map)
    }
    return m
  },
  cleanup(m, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(m)
    if (markerClustererContext?.markerClusterer.value) {
      markerClustererContext.markerClusterer.value.removeMarker(m, true)
      markerClustererContext.requestRerender()
    }
    else {
      m.setMap(null)
    }
  },
})

watch(() => props.position, (position) => {
  if (marker.value && position) {
    marker.value.setPosition(position)
  }
})

watch(() => props.options, (options) => {
  if (marker.value && options) {
    marker.value.setOptions(options)
  }
}, { deep: true })

provide(MARKER_INJECTION_KEY, { marker })
</script>

<template>
  <slot v-if="marker" />
</template>
