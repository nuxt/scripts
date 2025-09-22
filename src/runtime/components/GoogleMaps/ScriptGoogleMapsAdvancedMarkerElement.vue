<template>
  <slot v-if="advancedMarkerElement" />
</template>

<script lang="ts">
import type { InjectionKey, ShallowRef } from 'vue'
import { inject, onUnmounted, provide, shallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'

export const ADVANCED_MARKER_ELEMENT_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  advancedMarkerElement: ShallowRef<google.maps.marker.AdvancedMarkerElement | undefined>
}>
</script>

<script setup lang="ts">
const props = defineProps<{
  options?: Omit<google.maps.marker.AdvancedMarkerElementOptions, 'map'>
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

const advancedMarkerElement = shallowRef<google.maps.marker.AdvancedMarkerElement | undefined>(undefined)

whenever(() => mapContext?.map.value && mapContext.mapsApi.value, async () => {
  await mapContext!.mapsApi.value!.importLibrary('marker')

  advancedMarkerElement.value = new mapContext!.mapsApi.value!.marker.AdvancedMarkerElement(props.options)

  setupAdvancedMarkerElementEventListeners(advancedMarkerElement.value)

  if (markerClustererContext?.markerClusterer.value) {
    markerClustererContext.markerClusterer.value.addMarker(advancedMarkerElement.value)
  }
  else {
    advancedMarkerElement.value.map = mapContext!.map.value
  }

  whenever(() => props.options, (options) => {
    if (advancedMarkerElement.value && options) {
      Object.assign(advancedMarkerElement.value, options)
    }
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!advancedMarkerElement.value || !mapContext?.mapsApi.value) {
    return
  }

  mapContext.mapsApi.value.event.clearInstanceListeners(advancedMarkerElement.value)

  if (markerClustererContext) {
    markerClustererContext.markerClusterer.value?.removeMarker(advancedMarkerElement.value)
  }
  else {
    advancedMarkerElement.value.map = null
  }
})

provide(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, { advancedMarkerElement })

function setupAdvancedMarkerElementEventListeners(advancedMarkerElement: google.maps.marker.AdvancedMarkerElement) {
  eventsWithoutPayload.forEach((event) => {
    advancedMarkerElement.addListener(event, () => emit(event))
  })

  eventsWithMapMouseEventPayload.forEach((event) => {
    advancedMarkerElement.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>
