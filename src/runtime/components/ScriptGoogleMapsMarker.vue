<template>
  <slot />
</template>

<script lang="ts">
import type { InjectionKey, Ref } from 'vue'
import { inject, onUnmounted, provide, ref } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'

export const MARKER_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  marker: Ref<google.maps.Marker | undefined>
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

let marker: google.maps.Marker | undefined = undefined

const markerEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  marker = new google.maps.Marker(props.options)

  markerEventListeners.push(...setupMarkerEventListeners(marker))

  whenever(() => props.options, (options) => {
    marker?.setOptions(options)
  }, {
    deep: true,
  })

  if (markerClustererContext?.markerClusterer.value) {
    markerClustererContext.markerClusterer.value.addMarker(marker)
  }
  else {
    marker.setMap(map)
  }
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!marker) {
    return
  }

  markerEventListeners.forEach(listener => listener.remove())

  if (markerClustererContext) {
    markerClustererContext.markerClusterer.value?.removeMarker(marker)
  }
  else {
    marker.setMap(null)
  }
})

provide(MARKER_INJECTION_KEY, { marker: ref(marker) })

function setupMarkerEventListeners(marker: google.maps.Marker): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(marker.addListener('animation_changed', () => emit('animation_changed')))
  listeners.push(marker.addListener('clickable_changed', () => emit('clickable_changed')))
  listeners.push(marker.addListener('cursor_changed', () => emit('cursor_changed')))
  listeners.push(marker.addListener('draggable_changed', () => emit('draggable_changed')))
  listeners.push(marker.addListener('flat_changed', () => emit('flat_changed')))
  listeners.push(marker.addListener('icon_changed', () => emit('icon_changed')))
  listeners.push(marker.addListener('position_changed', () => emit('position_changed')))
  listeners.push(marker.addListener('shape_changed', () => emit('shape_changed')))
  listeners.push(marker.addListener('title_changed', () => emit('title_changed')))
  listeners.push(marker.addListener('visible_changed', () => emit('visible_changed')))
  listeners.push(marker.addListener('zindex_changed', () => emit('zindex_changed')))

  listeners.push(marker.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event)))
  listeners.push(marker.addListener('contextmenu', (event: google.maps.MapMouseEvent) => emit('contextmenu', event)))
  listeners.push(marker.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event)))
  listeners.push(marker.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event)))
  listeners.push(marker.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event)))
  listeners.push(marker.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event)))
  listeners.push(marker.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event)))
  listeners.push(marker.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event)))
  listeners.push(marker.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event)))
  listeners.push(marker.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event)))

  return listeners
}
</script>
