<script lang="ts">
import type { InjectionKey, ShallowRef } from 'vue'
import { provide, shallowRef, watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

// Inline types to avoid requiring @googlemaps/markerclusterer as a build-time dependency
export interface MarkerClustererInstance {
  render: () => void
  setMap: (map: google.maps.Map | null) => void
  addListener: (event: string, handler: () => void) => void
  addMarker: (marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker, noDraw?: boolean) => void
  removeMarker: (marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker, noDraw?: boolean) => boolean
}

export interface MarkerClustererOptions {
  markers?: google.maps.marker.AdvancedMarkerElement[]
  algorithm?: unknown
  renderer?: unknown
  onClusterClick?: unknown
}

export const MARKER_CLUSTERER_INJECTION_KEY = Symbol('marker-clusterer') as InjectionKey<{
  markerClusterer: ShallowRef<MarkerClustererInstance | undefined>
  requestRerender: () => void
}>
</script>

<script setup lang="ts">
const props = defineProps<{
  /**
   * Configuration options for the marker clusterer.
   * @see https://googlemaps.github.io/js-markerclusterer/interfaces/MarkerClustererOptions.html
   */
  options?: Omit<MarkerClustererOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when a cluster is clicked.
   */
  click: [payload: MarkerClustererInstance]
  /**
   * Fired when the clusterer begins clustering markers.
   */
  clusteringbegin: [payload: MarkerClustererInstance]
  /**
   * Fired when the clusterer finishes clustering markers.
   */
  clusteringend: [payload: MarkerClustererInstance]
}>()

const markerClustererEvents = [
  'click',
  'clusteringbegin',
  'clusteringend',
] as const

const markerClusterer = useGoogleMapsResource<MarkerClustererInstance>({
  async create({ map }) {
    const { MarkerClusterer } = await import('@googlemaps/markerclusterer')
    const clusterer = new MarkerClusterer({
      map,
      ...props.options,
    } as any) as MarkerClustererInstance
    bindGoogleMapsEvents(clusterer, emit, { withPayload: markerClustererEvents })
    return clusterer
  },
  cleanup(clusterer, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(clusterer)
    clusterer.setMap(null)
  },
})

const rerenderPending = shallowRef(false)

function requestRerender() {
  rerenderPending.value = true
}

watch(
  () => rerenderPending.value && markerClusterer.value,
  (ready) => {
    if (!ready)
      return
    rerenderPending.value = false
    try {
      markerClusterer.value!.render()
    }
    catch (err) {
      if (import.meta.dev) {
        console.error('[nuxt-scripts] MarkerClusterer render failed:', err)
      }
    }
  },
)

provide(
  MARKER_CLUSTERER_INJECTION_KEY,
  {
    markerClusterer,
    requestRerender,
  },
)
</script>

<template>
  <slot v-if="markerClusterer" />
</template>
