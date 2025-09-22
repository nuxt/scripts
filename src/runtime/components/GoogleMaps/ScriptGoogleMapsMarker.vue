<template>
  <slot v-if="marker" />
</template>

<script lang="ts">
import type { InjectionKey, ShallowRef } from 'vue'
import { inject, onUnmounted, provide, shallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'

export const MARKER_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  marker: ShallowRef<google.maps.Marker | undefined>
}>
</script>

<script setup lang="ts">
const props = defineProps<{
  options?: Omit<google.maps.MarkerOptions, 'map'>
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

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

const marker = shallowRef<google.maps.Marker | undefined>(undefined)

whenever(() => mapContext?.map.value && mapContext.mapsApi.value, () => {
  marker.value = new mapContext!.mapsApi.value!.Marker(props.options)

  setupMarkerEventListeners(marker.value)

  if (markerClustererContext?.markerClusterer.value) {
    markerClustererContext.markerClusterer.value.addMarker(marker.value)
  }
  else {
    marker.value.setMap(mapContext!.map.value!)
  }

  whenever(() => props.options, (options) => {
    marker.value?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!marker.value || !mapContext?.mapsApi.value) {
    return
  }

  mapContext.mapsApi.value.event.clearInstanceListeners(marker.value)

  if (markerClustererContext?.markerClusterer.value) {
    markerClustererContext.markerClusterer.value.removeMarker(marker.value, true)

    markerClustererContext.reportMarkerRemoval()
  }
  else {
    marker.value.setMap(null)
  }
})

provide(MARKER_INJECTION_KEY, { marker })

function setupMarkerEventListeners(marker: google.maps.Marker) {
  eventsWithoutPayload.forEach((event) => {
    marker.addListener(event, () => emit(event))
  })

  eventsWithMapMouseEventPayload.forEach((event) => {
    marker.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>
