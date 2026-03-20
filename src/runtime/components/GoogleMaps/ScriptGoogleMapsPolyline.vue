<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.PolylineOptions, 'map'>
}>()

const emit = defineEmits<{
  (event: 'click', payload: google.maps.PolyMouseEvent): void
  (event: 'contextmenu', payload: google.maps.PolyMouseEvent): void
  (event: 'dblclick', payload: google.maps.PolyMouseEvent): void
  (event: 'mousedown', payload: google.maps.PolyMouseEvent): void
  (event: 'mousemove', payload: google.maps.PolyMouseEvent): void
  (event: 'mouseout', payload: google.maps.PolyMouseEvent): void
  (event: 'mouseover', payload: google.maps.PolyMouseEvent): void
  (event: 'mouseup', payload: google.maps.PolyMouseEvent): void
  (event: 'drag', payload: google.maps.MapMouseEvent): void
  (event: 'dragend', payload: google.maps.MapMouseEvent): void
  (event: 'dragstart', payload: google.maps.MapMouseEvent): void
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
    bindGoogleMapsEvents(p, emit, {
      withPayload: [...eventsWithPolyMouseEventPayload, ...eventsWithMapMouseEventPayload],
    })
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
</script>

<template>
</template>
