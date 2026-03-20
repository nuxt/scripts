<script setup lang="ts">
import { watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.PolygonOptions, 'map'>
}>()

const emit = defineEmits<{
  click: [payload: google.maps.PolyMouseEvent]
  contextmenu: [payload: google.maps.PolyMouseEvent]
  dblclick: [payload: google.maps.PolyMouseEvent]
  mousedown: [payload: google.maps.PolyMouseEvent]
  mousemove: [payload: google.maps.PolyMouseEvent]
  mouseout: [payload: google.maps.PolyMouseEvent]
  mouseover: [payload: google.maps.PolyMouseEvent]
  mouseup: [payload: google.maps.PolyMouseEvent]
  drag: [payload: google.maps.MapMouseEvent]
  dragend: [payload: google.maps.MapMouseEvent]
  dragstart: [payload: google.maps.MapMouseEvent]
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
  if (polygon.value && options) {
    polygon.value.setOptions(options)
  }
}, { deep: true })
</script>

<template>
</template>
