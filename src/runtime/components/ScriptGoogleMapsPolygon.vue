<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.PolygonOptions, 'map'>
}>()

const eventsWithPolyMouseEventPayload = [
  'click',
  'contextmenu',
  'dblclick',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

const eventsWithMapMouseEventPayload = [
  'drag',
  'dragend',
  'dragstart',
] as const

const emit = defineEmits<{
  (event: typeof eventsWithPolyMouseEventPayload[number], payload: google.maps.PolyMouseEvent): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let polygon: google.maps.Polygon | undefined = undefined

whenever(() => mapContext?.map.value, (map) => {
  polygon = new google.maps.Polygon({
    map,
    ...props.options,
  })

  setupPolygonEventListeners(polygon)

  whenever(() => props.options, (options) => {
    polygon?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!polygon) {
    return
  }

  google.maps.event.clearInstanceListeners(polygon)

  polygon.setMap(null)
})

function setupPolygonEventListeners(polygon: google.maps.Polygon) {
  eventsWithPolyMouseEventPayload.forEach((event) => {
    polygon.addListener(event, (payload: google.maps.PolyMouseEvent) => emit(event, payload))
  })

  eventsWithMapMouseEventPayload.forEach((event) => {
    polygon.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>
