<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.RectangleOptions, 'map'>
}>()

const eventsWithoutPayload = [
  'bounds_changed',
] as const

const eventsWithMapMouseEventPayload = [
  'click',
  'contextmenu',
  'dblclick',
  'drag',
  'dragend',
  'dragstart',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let rectangle: google.maps.Rectangle | undefined = undefined

whenever(() => mapContext?.map.value, (map) => {
  rectangle = new google.maps.Rectangle({
    map,
    ...props.options,
  })

  setupRectangleEventListeners(rectangle)

  whenever(() => props.options, (options) => {
    rectangle?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!rectangle) {
    return
  }

  google.maps.event.clearInstanceListeners(rectangle)

  rectangle.setMap(null)
})

function setupRectangleEventListeners(rectangle: google.maps.Rectangle) {
  eventsWithoutPayload.forEach((event) => {
    rectangle.addListener(event, () => emit(event))
  })

  eventsWithMapMouseEventPayload.forEach((event) => {
    rectangle.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>
