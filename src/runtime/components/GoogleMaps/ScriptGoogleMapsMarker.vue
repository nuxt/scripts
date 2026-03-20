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
  position?: google.maps.LatLngLiteral | google.maps.LatLng
  options?: Omit<google.maps.MarkerOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: 'animation_changed'): void
  (event: 'clickable_changed'): void
  (event: 'cursor_changed'): void
  (event: 'draggable_changed'): void
  (event: 'flat_changed'): void
  (event: 'icon_changed'): void
  (event: 'position_changed'): void
  (event: 'shape_changed'): void
  (event: 'title_changed'): void
  (event: 'visible_changed'): void
  (event: 'zindex_changed'): void
  (event: 'click', payload: google.maps.MapMouseEvent): void
  (event: 'contextmenu', payload: google.maps.MapMouseEvent): void
  (event: 'dblclick', payload: google.maps.MapMouseEvent): void
  (event: 'drag', payload: google.maps.MapMouseEvent): void
  (event: 'dragend', payload: google.maps.MapMouseEvent): void
  (event: 'dragstart', payload: google.maps.MapMouseEvent): void
  (event: 'mousedown', payload: google.maps.MapMouseEvent): void
  (event: 'mouseout', payload: google.maps.MapMouseEvent): void
  (event: 'mouseover', payload: google.maps.MapMouseEvent): void
  (event: 'mouseup', payload: google.maps.MapMouseEvent): void
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
