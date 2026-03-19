<script lang="ts">
import { inject, provide, watch } from 'vue'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './injectionKeys'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

export { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './injectionKeys'
</script>

<script setup lang="ts">
const props = defineProps<{
  options?: Omit<google.maps.marker.AdvancedMarkerElementOptions, 'map'>
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

const advancedMarkerElement = useGoogleMapsResource<google.maps.marker.AdvancedMarkerElement>({
  async create({ mapsApi, map }) {
    await mapsApi.importLibrary('marker')
    const marker = new mapsApi.marker.AdvancedMarkerElement(props.options)
    setupEventListeners(marker)
    if (markerClustererContext?.markerClusterer.value) {
      markerClustererContext.markerClusterer.value.addMarker(marker, true)
      markerClustererContext.requestRerender()
    }
    else {
      marker.map = map
    }
    return marker
  },
  cleanup(marker, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(marker)
    if (markerClustererContext?.markerClusterer.value) {
      markerClustererContext.markerClusterer.value.removeMarker(marker, true)
      markerClustererContext.requestRerender()
    }
    else {
      marker.map = null
    }
  },
})

watch(() => props.options, (options) => {
  if (advancedMarkerElement.value && options) {
    Object.assign(advancedMarkerElement.value, options)
  }
}, { deep: true })

provide(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, { advancedMarkerElement })

function setupEventListeners(marker: google.maps.marker.AdvancedMarkerElement) {
  eventsWithoutPayload.forEach((event) => {
    marker.addListener(event, () => emit(event))
  })
  eventsWithMapMouseEventPayload.forEach((event) => {
    marker.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>

<template>
  <slot v-if="advancedMarkerElement" />
</template>
