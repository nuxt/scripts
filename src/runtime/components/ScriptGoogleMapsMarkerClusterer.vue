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

const emit = defineEmits<{
  (
    event: 'click' | 'clusteringbegin' | 'clusteringend',
    payload: MarkerClusterer
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

const markerClusterer = shallowRef<MarkerClusterer | undefined>(undefined)

const markerClustererEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  markerClusterer.value = new MarkerClusterer({
    map,
    ...props.options,
  })

  markerClustererEventListeners.push(...setupMarkerClustererEventListeners(markerClusterer.value))
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  markerClustererEventListeners.forEach(listener => listener.remove())

  markerClusterer.value?.setMap(null)
})

provide(MARKER_CLUSTERER_INJECTION_KEY, { markerClusterer })

function setupMarkerClustererEventListeners(markerClusterer: MarkerClusterer): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(markerClusterer.addListener('click', () => emit('click', markerClusterer)))
  listeners.push(markerClusterer.addListener('clusteringbegin', () => emit('clusteringbegin', markerClusterer)))
  listeners.push(markerClusterer.addListener('clusteringend', () => emit('clusteringend', markerClusterer)))

  return listeners
}
</script>
