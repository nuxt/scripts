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

const marker = shallowRef<google.maps.Marker | undefined>(undefined)

whenever(() => mapContext?.map.value, (map) => {
  marker.value = new google.maps.Marker(props.options)

  setupMarkerEventListeners(marker.value)

  if (markerClustererContext?.markerClusterer.value) {
    markerClustererContext.markerClusterer.value.addMarker(marker.value)
  }
  else {
    marker.value.setMap(map)
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
  if (!marker.value) {
    return
  }

  google.maps.event.clearInstanceListeners(marker.value)

  if (markerClustererContext) {
    markerClustererContext.markerClusterer.value?.removeMarker(marker.value)
  }
  else {
    marker.value.setMap(null)
  }
})

provide(MARKER_INJECTION_KEY, { marker })

function setupMarkerEventListeners(marker: google.maps.Marker) {
  marker.addListener('animation_changed', () => emit('animation_changed'))
  marker.addListener('clickable_changed', () => emit('clickable_changed'))
  marker.addListener('cursor_changed', () => emit('cursor_changed'))
  marker.addListener('draggable_changed', () => emit('draggable_changed'))
  marker.addListener('flat_changed', () => emit('flat_changed'))
  marker.addListener('icon_changed', () => emit('icon_changed'))
  marker.addListener('position_changed', () => emit('position_changed'))
  marker.addListener('shape_changed', () => emit('shape_changed'))
  marker.addListener('title_changed', () => emit('title_changed'))
  marker.addListener('visible_changed', () => emit('visible_changed'))
  marker.addListener('zindex_changed', () => emit('zindex_changed'))

  marker.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event))
  marker.addListener('contextmenu', (event: google.maps.MapMouseEvent) => emit('contextmenu', event))
  marker.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event))
  marker.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event))
  marker.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event))
  marker.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event))
  marker.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event))
  marker.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event))
  marker.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event))
  marker.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event))
}
</script>
