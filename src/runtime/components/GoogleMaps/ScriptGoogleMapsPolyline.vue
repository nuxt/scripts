<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.PolylineOptions, 'map'>
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

let polyline: google.maps.Polyline | undefined = undefined

whenever(() => mapContext?.map.value && mapContext.mapsApi.value, () => {
  polyline = new mapContext!.mapsApi.value!.Polyline({
    map: mapContext!.map.value,
    ...props.options,
  })

  setupPolylineEventListeners(polyline)

  whenever(() => props.options, (options) => {
    polyline?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!polyline || !mapContext?.mapsApi.value) {
    return
  }

  mapContext.mapsApi.value.event.clearInstanceListeners(polyline)

  polyline.setMap(null)
})

function setupPolylineEventListeners(polyline: google.maps.Polyline) {
  eventsWithPolyMouseEventPayload.forEach((event) => {
    polyline.addListener(event, (payload: google.maps.PolyMouseEvent) => emit(event, payload))
  })

  eventsWithMapMouseEventPayload.forEach((event) => {
    polyline.addListener(event, (payload: google.maps.MapMouseEvent) => emit(event, payload))
  })
}
</script>
