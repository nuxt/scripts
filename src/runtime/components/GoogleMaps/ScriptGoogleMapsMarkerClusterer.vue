<template>
  <slot v-if="markerClusterer" />
</template>

<script lang="ts">
import { MarkerClusterer, type MarkerClustererOptions } from '@googlemaps/markerclusterer'
import { inject, onUnmounted, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

export const MARKER_CLUSTERER_INJECTION_KEY = Symbol('marker-clusterer') as InjectionKey<{
  markerClusterer: ShallowRef<MarkerClusterer | undefined>
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
  (event: typeof markerClustererEvents[number], payload: MarkerClusterer): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

const markerClusterer = shallowRef<MarkerClusterer | undefined>(undefined)

whenever(() => mapContext?.map.value, (map) => {
  markerClusterer.value = new MarkerClusterer({
    map,
    ...props.options,
  })

  setupMarkerClustererEventListeners(markerClusterer.value)
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!markerClusterer.value || !mapContext?.mapsApi.value) {
    return
  }

  mapContext.mapsApi.value.event.clearInstanceListeners(markerClusterer.value)

  markerClusterer.value.setMap(null)
})

provide(MARKER_CLUSTERER_INJECTION_KEY, { markerClusterer })

function setupMarkerClustererEventListeners(markerClusterer: MarkerClusterer) {
  markerClustererEvents.forEach((event) => {
    markerClusterer.addListener(event, () => emit(event, markerClusterer))
  })
}
</script>
