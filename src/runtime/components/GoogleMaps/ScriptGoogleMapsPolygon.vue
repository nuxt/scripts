<script setup lang="ts">
import { watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.PolygonOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: typeof eventsWithPolyMouseEventPayload[number], payload: google.maps.PolyMouseEvent): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
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

const polygon = useGoogleMapsResource<google.maps.Polygon>({
  create({ mapsApi, map }) {
    const p = new mapsApi.Polygon({ map, ...props.options })
    setupEventListeners(p)
    return p
  },
  cleanup(p, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(p)
    p.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (polygon.value && options) {
    polygon.value.setOptions(options)
  }
}, { deep: true })

function setupEventListeners(p: google.maps.Polygon) {
  eventsWithPolyMouseEventPayload.forEach((event) => {
    p.addListener(event, (payload: google.maps.PolyMouseEvent) => emit(event, payload))
  })
  eventsWithMapMouseEventPayload.forEach((event) => {
    p.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>

<template>
</template>
