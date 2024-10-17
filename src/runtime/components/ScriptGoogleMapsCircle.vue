<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.CircleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event:
    | 'center_changed'
    | 'radius_changed'
  ): void
  (event:
    | 'click'
    | 'dblclick'
    | 'drag'
    | 'dragend'
    | 'dragstart'
    | 'mousedown'
    | 'mousemove'
    | 'mouseout'
    | 'mouseover'
    | 'mouseup'
    | 'rightclick',
    payload: google.maps.MapMouseEvent
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let circle: google.maps.Circle | undefined = undefined

const circleEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  circle = new google.maps.Circle({
    map,
    ...props.options,
  })

  whenever(() => props.options, (options) => {
    circle?.setOptions(options)
  }, {
    deep: true,
  })

  circleEventListeners.push(...setupCircleEventListeners(circle))
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  circleEventListeners.forEach(listener => listener.remove())

  circle?.setMap(null)
})

function setupCircleEventListeners(circle: google.maps.Circle): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(circle.addListener('center_changed', () => emit('center_changed')))
  listeners.push(circle.addListener('radius_changed', () => emit('radius_changed')))

  listeners.push(circle.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event)))
  listeners.push(circle.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event)))
  listeners.push(circle.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event)))
  listeners.push(circle.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event)))
  listeners.push(circle.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event)))
  listeners.push(circle.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event)))
  listeners.push(circle.addListener('mousemove', (event: google.maps.MapMouseEvent) => emit('mousemove', event)))
  listeners.push(circle.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event)))
  listeners.push(circle.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event)))
  listeners.push(circle.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event)))
  listeners.push(circle.addListener('rightclick', (event: google.maps.MapMouseEvent) => emit('rightclick', event)))

  return listeners
}
</script>
