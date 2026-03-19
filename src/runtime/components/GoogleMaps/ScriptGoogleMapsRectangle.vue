<script setup lang="ts">
import { watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.RectangleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
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

const rectangle = useGoogleMapsResource<google.maps.Rectangle>({
  create({ mapsApi, map }) {
    const r = new mapsApi.Rectangle({ map, ...props.options })
    setupEventListeners(r)
    return r
  },
  cleanup(r, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(r)
    r.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (rectangle.value && options) {
    rectangle.value.setOptions(options)
  }
}, { deep: true })

function setupEventListeners(r: google.maps.Rectangle) {
  eventsWithoutPayload.forEach((event) => {
    r.addListener(event, () => emit(event))
  })
  eventsWithMapMouseEventPayload.forEach((event) => {
    r.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>

<template>
</template>
