<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.PolylineOptions, 'map'>
}>()

const emit = defineEmits<{
  (event:
    | 'click'
    | 'contextmenu'
    | 'dblclick'
    | 'mousedown'
    | 'mousemove'
    | 'mouseout'
    | 'mouseover'
    | 'mouseup',
    payload: google.maps.PolyMouseEvent
  ): void
  (event:
    | 'drag'
    | 'dragend'
    | 'dragstart',
    payload: google.maps.MapMouseEvent
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let polyline: google.maps.Polyline | undefined = undefined

const polylineEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  polyline = new google.maps.Polyline({
    map,
    ...props.options,
  })

  polylineEventListeners.push(...setupPolylineEventListeners(polyline))
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  polylineEventListeners.forEach(listener => listener.remove())

  polyline?.setMap(null)
})

function setupPolylineEventListeners(polyline: google.maps.Polyline): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(polyline.addListener('click', (event: google.maps.PolyMouseEvent) => emit('click', event)))
  listeners.push(polyline.addListener('contextmenu', (event: google.maps.PolyMouseEvent) => emit('contextmenu', event)))
  listeners.push(polyline.addListener('dblclick', (event: google.maps.PolyMouseEvent) => emit('dblclick', event)))
  listeners.push(polyline.addListener('mousedown', (event: google.maps.PolyMouseEvent) => emit('mousedown', event)))
  listeners.push(polyline.addListener('mousemove', (event: google.maps.PolyMouseEvent) => emit('mousemove', event)))
  listeners.push(polyline.addListener('mouseout', (event: google.maps.PolyMouseEvent) => emit('mouseout', event)))
  listeners.push(polyline.addListener('mouseover', (event: google.maps.PolyMouseEvent) => emit('mouseover', event)))
  listeners.push(polyline.addListener('mouseup', (event: google.maps.PolyMouseEvent) => emit('mouseup', event)))

  listeners.push(polyline.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event)))
  listeners.push(polyline.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event)))
  listeners.push(polyline.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event)))

  return listeners
}
</script>
