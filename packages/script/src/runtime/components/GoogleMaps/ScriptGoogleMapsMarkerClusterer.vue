<script lang="ts">
import type { InjectionKey, ShallowRef } from 'vue'
import { inject, provide, shallowRef, watch } from 'vue'
import { bindGoogleMapsEvents, MAP_INJECTION_KEY, useGoogleMapsResource } from './useGoogleMapsResource'

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

export interface MarkerClustererContext {
  markerClusterer: ShallowRef<MarkerClustererInstance | undefined>
  requestRerender: () => void
  /** Increments after each clustering cycle; watch to detect cluster membership changes */
  clusteringVersion: ShallowRef<number>
}

export const MARKER_CLUSTERER_INJECTION_KEY = Symbol('marker-clusterer') as InjectionKey<MarkerClustererContext>
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

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const clusteringVersion = shallowRef(0)

const markerClusterer = useGoogleMapsResource<MarkerClustererInstance>({
  async create({ map }) {
    const { MarkerClusterer } = await import('@googlemaps/markerclusterer')
    const clusterer = new MarkerClusterer({
      map,
      ...props.options,
    } as any) as MarkerClustererInstance
    bindGoogleMapsEvents(clusterer, emit, { withPayload: markerClustererEvents })
    clusterer.addListener('clusteringend', () => {
      clusteringVersion.value++
    })
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
    // Guard: map projection must be ready, otherwise MarkerClusterer.render()
    // throws "Cannot read properties of null (reading 'fromLatLngToDivPixel')"
    // Keep rerenderPending true so the request isn't lost
    if (!mapContext?.map.value?.getProjection())
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
    clusteringVersion,
  },
)
</script>

<template>
  <slot v-if="markerClusterer" />
</template>
