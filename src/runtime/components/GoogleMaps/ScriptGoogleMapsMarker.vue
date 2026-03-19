<script lang="ts">
import { inject, provide, watch } from 'vue'
import { MARKER_INJECTION_KEY } from './injectionKeys'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

export { MARKER_INJECTION_KEY } from './injectionKeys'
</script>

<script setup lang="ts">
const props = defineProps<{
  options?: Omit<google.maps.MarkerOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
}>()

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
    const m = new mapsApi.Marker(props.options)
    setupEventListeners(m)
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

watch(() => props.options, (options) => {
  if (marker.value && options) {
    marker.value.setOptions(options)
  }
}, { deep: true })

provide(MARKER_INJECTION_KEY, { marker })

function setupEventListeners(m: google.maps.Marker) {
  eventsWithoutPayload.forEach((event) => {
    m.addListener(event, () => emit(event))
  })
  eventsWithMapMouseEventPayload.forEach((event) => {
    m.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>

<template>
  <slot v-if="marker" />
</template>
