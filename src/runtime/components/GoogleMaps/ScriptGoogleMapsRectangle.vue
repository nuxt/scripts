<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.RectangleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: 'bounds_changed'): void
  (event: 'click', payload: google.maps.MapMouseEvent): void
  (event: 'contextmenu', payload: google.maps.MapMouseEvent): void
  (event: 'dblclick', payload: google.maps.MapMouseEvent): void
  (event: 'drag', payload: google.maps.MapMouseEvent): void
  (event: 'dragend', payload: google.maps.MapMouseEvent): void
  (event: 'dragstart', payload: google.maps.MapMouseEvent): void
  (event: 'mousedown', payload: google.maps.MapMouseEvent): void
  (event: 'mousemove', payload: google.maps.MapMouseEvent): void
  (event: 'mouseout', payload: google.maps.MapMouseEvent): void
  (event: 'mouseover', payload: google.maps.MapMouseEvent): void
  (event: 'mouseup', payload: google.maps.MapMouseEvent): void
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
    bindGoogleMapsEvents(r, emit, {
      noPayload: eventsWithoutPayload,
      withPayload: eventsWithMapMouseEventPayload,
    })
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
</script>

<template>
</template>
