<script lang="ts">
import { inject, provide, useSlots, useTemplateRef, watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './injectionKeys'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

export { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './injectionKeys'
</script>

<script setup lang="ts">
const props = defineProps<{
  position?: google.maps.LatLngLiteral | google.maps.LatLng
  options?: Omit<google.maps.marker.AdvancedMarkerElementOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
}>()

// AdvancedMarkerElement supported events only
// See https://developers.google.com/maps/documentation/javascript/reference/advanced-markers
const eventsWithoutPayload = [] as const

const eventsWithMapMouseEventPayload = [
  'click',
  'drag',
  'dragend',
  'dragstart',
] as const

const slots = useSlots()
const markerContent = useTemplateRef('marker-content')
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

const advancedMarkerElement = useGoogleMapsResource<google.maps.marker.AdvancedMarkerElement>({
  ready: () => !slots.content || !!markerContent.value,
  async create({ mapsApi, map }) {
    await mapsApi.importLibrary('marker')
    const marker = new mapsApi.marker.AdvancedMarkerElement({
      ...props.options,
      ...(props.position ? { position: props.position } : {}),
    })

    // Use #content slot as marker visual if provided
    if (markerContent.value) {
      marker.content = markerContent.value
    }

    bindGoogleMapsEvents(marker, emit, {
      noPayload: eventsWithoutPayload,
      withPayload: eventsWithMapMouseEventPayload,
    })

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

watch(
  () => [props.position?.lat, props.position?.lng, props.position, props.options],
  () => {
    if (!advancedMarkerElement.value)
      return

    if (props.options)
      Object.assign(advancedMarkerElement.value, props.options)
    advancedMarkerElement.value.position = props.position ?? props.options?.position
  },
  { deep: true },
)

provide(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, { advancedMarkerElement })
</script>

<template>
  <!-- Hidden container for #content slot — becomes the marker visual -->
  <div v-if="$slots.content" style="display: none;">
    <div ref="marker-content">
      <slot name="content" />
    </div>
  </div>
  <!-- Default slot for child components (InfoWindow, OverlayView, etc.) -->
  <slot v-if="advancedMarkerElement" />
</template>
