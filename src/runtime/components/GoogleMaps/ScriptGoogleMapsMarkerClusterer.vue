<script lang="ts">
import type { InjectionKey, ShallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { provide, shallowRef } from 'vue'
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
  options?: Omit<MarkerClustererOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: typeof markerClustererEvents[number], payload: MarkerClustererInstance): void
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
    setupEventListeners(clusterer)
    return clusterer
  },
  cleanup(clusterer, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(clusterer)
    clusterer.setMap(null)
  },
})

const markerClustererNeedsRerender = shallowRef(false)

function requestRerender() {
  markerClustererNeedsRerender.value = true
}

whenever(() => markerClustererNeedsRerender.value && markerClusterer.value, () => {
  markerClusterer.value!.render()
  markerClustererNeedsRerender.value = false
})

provide(
  MARKER_CLUSTERER_INJECTION_KEY,
  {
    markerClusterer,
    requestRerender,
  },
)

function setupEventListeners(clusterer: MarkerClustererInstance) {
  markerClustererEvents.forEach((event) => {
    clusterer.addListener(event, () => emit(event, clusterer))
  })
}
</script>

<template>
  <slot v-if="markerClusterer" />
</template>
