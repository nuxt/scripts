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

const emit = defineEmits<{
  (event:
    | 'animation_changed'
    | 'clickable_changed'
    | 'cursor_changed'
    | 'draggable_changed'
    | 'flat_changed'
    | 'icon_changed'
    | 'position_changed'
    | 'shape_changed'
    | 'title_changed'
    | 'visible_changed'
    | 'zindex_changed'
  ): void
  (event:
    | 'click'
    | 'contextmenu'
    | 'dblclick'
    | 'drag'
    | 'dragend'
    | 'dragstart'
    | 'mousedown'
    | 'mouseout'
    | 'mouseover'
    | 'mouseup',
    payload: google.maps.MapMouseEvent
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

const advancedMarkerElement = shallowRef<google.maps.marker.AdvancedMarkerElement | undefined>(undefined)

whenever(() => mapContext?.map.value, async (map) => {
  await mapContext!.mapsApi.value!.importLibrary('marker')

  advancedMarkerElement.value = new google.maps.marker.AdvancedMarkerElement(props.options)

  setupAdvancedMarkerElementEventListeners(advancedMarkerElement.value)

  if (markerClustererContext?.markerClusterer.value) {
    markerClustererContext.markerClusterer.value.addMarker(advancedMarkerElement.value)
  }
  else {
    advancedMarkerElement.value.map = map
  }
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!advancedMarkerElement.value) {
    return
  }

  google.maps.event.clearInstanceListeners(advancedMarkerElement.value)

  if (markerClustererContext) {
    markerClustererContext.markerClusterer.value?.removeMarker(advancedMarkerElement.value)
  }
  else {
    advancedMarkerElement.value.map = null
  }
})

provide(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, { advancedMarkerElement })

function setupAdvancedMarkerElementEventListeners(advancedMarkerElement: google.maps.marker.AdvancedMarkerElement) {
  advancedMarkerElement.addListener('animation_changed', () => emit('animation_changed'))
  advancedMarkerElement.addListener('clickable_changed', () => emit('clickable_changed'))
  advancedMarkerElement.addListener('cursor_changed', () => emit('cursor_changed'))
  advancedMarkerElement.addListener('draggable_changed', () => emit('draggable_changed'))
  advancedMarkerElement.addListener('flat_changed', () => emit('flat_changed'))
  advancedMarkerElement.addListener('icon_changed', () => emit('icon_changed'))
  advancedMarkerElement.addListener('position_changed', () => emit('position_changed'))
  advancedMarkerElement.addListener('shape_changed', () => emit('shape_changed'))
  advancedMarkerElement.addListener('title_changed', () => emit('title_changed'))
  advancedMarkerElement.addListener('visible_changed', () => emit('visible_changed'))
  advancedMarkerElement.addListener('zindex_changed', () => emit('zindex_changed'))

  advancedMarkerElement.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event))
  advancedMarkerElement.addListener('contextmenu', (event: google.maps.MapMouseEvent) => emit('contextmenu', event))
  advancedMarkerElement.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event))
  advancedMarkerElement.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event))
  advancedMarkerElement.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event))
  advancedMarkerElement.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event))
  advancedMarkerElement.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event))
  advancedMarkerElement.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event))
  advancedMarkerElement.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event))
  advancedMarkerElement.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event))
}
</script>
