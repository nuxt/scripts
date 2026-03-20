<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.CircleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: 'center_changed'): void
  (event: 'radius_changed'): void
  (event: 'click', payload: google.maps.MapMouseEvent): void
  (event: 'dblclick', payload: google.maps.MapMouseEvent): void
  (event: 'drag', payload: google.maps.MapMouseEvent): void
  (event: 'dragend', payload: google.maps.MapMouseEvent): void
  (event: 'dragstart', payload: google.maps.MapMouseEvent): void
  (event: 'mousedown', payload: google.maps.MapMouseEvent): void
  (event: 'mousemove', payload: google.maps.MapMouseEvent): void
  (event: 'mouseout', payload: google.maps.MapMouseEvent): void
  (event: 'mouseover', payload: google.maps.MapMouseEvent): void
  (event: 'mouseup', payload: google.maps.MapMouseEvent): void
  (event: 'rightclick', payload: google.maps.MapMouseEvent): void
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

const circle = useGoogleMapsResource<google.maps.Circle>({
  create({ mapsApi, map }) {
    const c = new mapsApi.Circle({ map, ...props.options })
    bindGoogleMapsEvents(c, emit, {
      noPayload: eventsWithoutPayload,
      withPayload: eventsWithMapMouseEventPayload,
    })
    return c
  },
  cleanup(c, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(c)
    c.setMap(null)
  },
})

watch(() => props.options, (options) => {
  if (circle.value && options) {
    circle.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
