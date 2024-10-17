<template>
  <slot />
</template>

<script lang="ts">
import { MarkerClusterer, type MarkerClustererOptions } from '@googlemaps/markerclusterer'
import { inject, onUnmounted, provide, ref, type InjectionKey, type Ref } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

export const MARKER_CLUSTERER_INJECTION_KEY = Symbol('marker-clusterer') as InjectionKey<{
  markerClusterer: Ref<MarkerClusterer | undefined>
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

let markerClusterer: MarkerClusterer | undefined = undefined

const markerClustererEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  markerClusterer = new MarkerClusterer({
    map,
    ...props.options,
  })

  markerClustererEventListeners.push(...setupMarkerClustererEventListeners(markerClusterer))
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  markerClustererEventListeners.forEach(listener => listener.remove())

  markerClusterer?.setMap(null)
})

provide(MARKER_CLUSTERER_INJECTION_KEY, {
  markerClusterer: ref(markerClusterer),
})

function setupMarkerClustererEventListeners(markerClusterer: MarkerClusterer): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(markerClusterer.addListener('click', () => emit('click', markerClusterer)))
  listeners.push(markerClusterer.addListener('clusteringbegin', () => emit('clusteringbegin', markerClusterer)))
  listeners.push(markerClusterer.addListener('clusteringend', () => emit('clusteringend', markerClusterer)))

  return listeners
}
</script>
