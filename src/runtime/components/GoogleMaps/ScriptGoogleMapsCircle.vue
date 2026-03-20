<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.CircleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: typeof eventsWithoutPayload[number]): void
  (event: typeof eventsWithMapMouseEventPayload[number], payload: google.maps.MapMouseEvent): void
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
