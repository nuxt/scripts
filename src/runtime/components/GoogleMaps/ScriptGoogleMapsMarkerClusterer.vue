<template>
  <slot v-if="markerClusterer" />
</template>

<script lang="ts">
import { inject, onUnmounted, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

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

const markerClustererEvents = [
  'click',
  'clusteringbegin',
  'clusteringend',
] as const

const emit = defineEmits<{
  (event: typeof markerClustererEvents[number], payload: MarkerClustererInstance): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

const markerClusterer = shallowRef<MarkerClustererInstance | undefined>(undefined)

whenever(() => mapContext?.map.value, async (map) => {
  const { MarkerClusterer } = await import('@googlemaps/markerclusterer')
  markerClusterer.value = new MarkerClusterer({
    map,
    ...props.options,
  } as any) as MarkerClustererInstance

  setupMarkerClustererEventListeners(markerClusterer.value)
}, {
  immediate: true,
  once: true,
})

const markerClustererNeedsRerender = shallowRef(false)

function requestRerender() {
  markerClustererNeedsRerender.value = true
}

whenever(() => markerClustererNeedsRerender.value && markerClusterer.value, () => {
  markerClusterer.value!.render()

  markerClustererNeedsRerender.value = false
})

onUnmounted(() => {
  if (!markerClusterer.value || !mapContext?.mapsApi.value) {
    return
  }

  mapContext.mapsApi.value.event.clearInstanceListeners(markerClusterer.value)

  markerClusterer.value.setMap(null)
})

provide(
  MARKER_CLUSTERER_INJECTION_KEY,
  {
    markerClusterer,
    requestRerender,
  },
)

function setupMarkerClustererEventListeners(clusterer: MarkerClustererInstance) {
  markerClustererEvents.forEach((event) => {
    clusterer.addListener(event, () => emit(event, clusterer))
  })
}
</script>
