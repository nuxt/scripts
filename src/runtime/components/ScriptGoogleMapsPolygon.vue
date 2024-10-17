<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.PolygonOptions, 'map'>
}>()

const emit = defineEmits<{
  (event:
    | 'click'
    | 'contextmenu'
    | 'dblclick'
    | 'mousedown'
    | 'mousemove'
    | 'mouseout'
    | 'mouseover'
    | 'mouseup',
    payload: google.maps.PolyMouseEvent
  ): void
  (event:
    | 'drag'
    | 'dragend'
    | 'dragstart',
    payload: google.maps.MapMouseEvent
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let polygon: google.maps.Polygon | undefined = undefined

const polygonEventListeners: google.maps.MapsEventListener[] = []

whenever(() => mapContext?.map.value, (map) => {
  polygon = new google.maps.Polygon({
    map,
    ...props.options,
  })

  whenever(() => props.options, (options) => {
    polygon?.setOptions(options)
  }, {
    deep: true,
  })

  polygonEventListeners.push(...setupPolygonEventListeners(polygon))
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  polygonEventListeners.forEach(listener => listener.remove())

  polygon?.setMap(null)
})

function setupPolygonEventListeners(polygon: google.maps.Polygon): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(polygon.addListener('click', (event: google.maps.PolyMouseEvent) => emit('click', event)))
  listeners.push(polygon.addListener('contextmenu', (event: google.maps.PolyMouseEvent) => emit('contextmenu', event)))
  listeners.push(polygon.addListener('dblclick', (event: google.maps.PolyMouseEvent) => emit('dblclick', event)))
  listeners.push(polygon.addListener('mousedown', (event: google.maps.PolyMouseEvent) => emit('mousedown', event)))
  listeners.push(polygon.addListener('mousemove', (event: google.maps.PolyMouseEvent) => emit('mousemove', event)))
  listeners.push(polygon.addListener('mouseout', (event: google.maps.PolyMouseEvent) => emit('mouseout', event)))
  listeners.push(polygon.addListener('mouseover', (event: google.maps.PolyMouseEvent) => emit('mouseover', event)))
  listeners.push(polygon.addListener('mouseup', (event: google.maps.PolyMouseEvent) => emit('mouseup', event)))

  listeners.push(polygon.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event)))
  listeners.push(polygon.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event)))
  listeners.push(polygon.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event)))

  return listeners
}
</script>
