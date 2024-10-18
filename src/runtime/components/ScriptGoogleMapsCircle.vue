<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.CircleOptions, 'map'>
}>()

const eventsWithoutPayload = [
  'center_changed',
  'radius_changed',
] as const

const eventsWithMapMouseEventPayload = [
  'click',
  'dblclick',
  'drag',
  'dragend',
  'dragstart',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'rightclick',
] as const

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
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
  eventsWithoutPayload.forEach((event) => {
    circle.addListener(event, () => emit(event))
  })

  eventsWithMapMouseEventPayload.forEach((event) => {
    circle.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>
