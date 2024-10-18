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

whenever(() => mapContext?.map.value, (map) => {
  circle = new google.maps.Circle({
    map,
    ...props.options,
  })

  setupCircleEventListeners(circle)

  whenever(() => props.options, (options) => {
    circle?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!circle) {
    return
  }

  google.maps.event.clearInstanceListeners(circle)

  circle.setMap(null)
})

function setupCircleEventListeners(circle: google.maps.Circle) {
  circle.addListener('center_changed', () => emit('center_changed'))
  circle.addListener('radius_changed', () => emit('radius_changed'))

  circle.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event))
  circle.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event))
  circle.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event))
  circle.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event))
  circle.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event))
  circle.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event))
  circle.addListener('mousemove', (event: google.maps.MapMouseEvent) => emit('mousemove', event))
  circle.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event))
  circle.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event))
  circle.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event))
  circle.addListener('rightclick', (event: google.maps.MapMouseEvent) => emit('rightclick', event))
}
</script>
