<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.RectangleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event:
    | 'bounds_changed'
  ): void
  (event:
    | 'click'
    | 'contextmenu'
    | 'dblclick'
    | 'drag'
    | 'dragend'
    | 'dragstart'
    | 'mousedown'
    | 'mousemove'
    | 'mouseout'
    | 'mouseover'
    | 'mouseup',
    payload: google.maps.MapMouseEvent
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let rectangle: google.maps.Rectangle | undefined = undefined

const rectangleEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  rectangle = new google.maps.Rectangle({
    map,
    ...props.options,
  })

  rectangleEventListeners.push(...setupRectangleEventListeners(rectangle))
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  rectangleEventListeners.forEach(listener => listener.remove())

  rectangle?.setMap(null)
})

function setupRectangleEventListeners(rectangle: google.maps.Rectangle): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(rectangle.addListener('bounds_changed', () => emit('bounds_changed')))

  listeners.push(rectangle.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event)))
  listeners.push(rectangle.addListener('contextmenu', (event: google.maps.MapMouseEvent) => emit('contextmenu', event)))
  listeners.push(rectangle.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event)))
  listeners.push(rectangle.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event)))
  listeners.push(rectangle.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event)))
  listeners.push(rectangle.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event)))
  listeners.push(rectangle.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event)))
  listeners.push(rectangle.addListener('mousemove', (event: google.maps.MapMouseEvent) => emit('mousemove', event)))
  listeners.push(rectangle.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event)))
  listeners.push(rectangle.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event)))
  listeners.push(rectangle.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event)))

  return listeners
}
</script>
