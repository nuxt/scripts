<script setup lang="ts">
import { watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.PolylineOptions, 'map'>
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

const polyline = useGoogleMapsResource<google.maps.Polyline>({
  create({ mapsApi, map }) {
    const p = new mapsApi.Polyline({ map, ...props.options })
    setupEventListeners(p)
    return p
  },
  cleanup(p, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(p)
    p.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (polyline.value && options) {
    polyline.value.setOptions(options)
  }
}, { deep: true })

function setupEventListeners(p: google.maps.Polyline) {
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
