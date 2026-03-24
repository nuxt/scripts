<script lang="ts">
import { inject, provide, useSlots, useTemplateRef, watch } from 'vue'
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
   * @see https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions.position
   */
  position?: google.maps.LatLngLiteral | google.maps.LatLng
  /**
   * Configuration options for the marker.
   * @see https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElementOptions
   */
  options?: Omit<google.maps.marker.AdvancedMarkerElementOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when the marker is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.click
   */
  click: [payload: google.maps.MapMouseEvent]
  /**
   * Fired repeatedly while the user drags the marker.
   * @see https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.drag
   */
  drag: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user stops dragging the marker.
   * @see https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.dragend
   */
  dragend: [payload: google.maps.MapMouseEvent]
  /**
   * Fired when the user starts dragging the marker.
   * @see https://developers.google.com/maps/documentation/javascript/reference/advanced-markers#AdvancedMarkerElement.dragstart
   */
  dragstart: [payload: google.maps.MapMouseEvent]
}>()
const dragEvents = ['drag', 'dragend', 'dragstart'] as const
const slots = useSlots()
const markerContent = useTemplateRef('marker-content')
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

// gmp-click handler for cleanup (AdvancedMarkerElement uses DOM gmp-click instead of Maps addListener click)
let gmpClickHandler: ((e: any) => void) | undefined

const advancedMarkerElement = useGoogleMapsResource<google.maps.marker.AdvancedMarkerElement>({
  ready: () => !slots.content || !!markerContent.value,
  async create({ mapsApi, map }) {
    await mapsApi.importLibrary('marker')
    const marker = new mapsApi.marker.AdvancedMarkerElement({
      ...props.options,
      gmpClickable: true,
      ...(props.position ? { position: props.position } : {}),
    })

    // Use #content slot as marker visual if provided
    if (markerContent.value) {
      marker.content = markerContent.value
    }

    if (markerClustererContext?.markerClusterer.value) {
      markerClustererContext.markerClusterer.value.addMarker(marker, true)
      markerClustererContext.requestRerender()
    }
    else {
      marker.map = map
    }

    // AdvancedMarkerElement: use gmp-click DOM event (addListener('click') is deprecated)
    gmpClickHandler = (e: any) => emit('click', e)
    marker.addEventListener('gmp-click', gmpClickHandler)

    // Drag events still use Maps API addListener
    bindGoogleMapsEvents(marker, emit, {
      withPayload: dragEvents,
    })

    return marker
  },
  cleanup(marker, { mapsApi }) {
    if (gmpClickHandler) {
      marker.removeEventListener('gmp-click', gmpClickHandler)
      gmpClickHandler = undefined
    }
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
  () => [props.position, props.options],
  () => {
    if (!advancedMarkerElement.value)
      return

    if (props.options)
      Object.assign(advancedMarkerElement.value, props.options)
    advancedMarkerElement.value.position = props.position ?? props.options?.position
  },
  { deep: true },
)

provide(MARKER_INJECTION_KEY, { advancedMarkerElement })
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
