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

whenever(() => mapContext?.map.value, (map) => {
  polygon = new google.maps.Polygon({
    map,
    ...props.options,
  })

  setupPolygonEventListeners(polygon)

  whenever(() => props.options, (options) => {
    polygon?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!polygon) {
    return
  }

  google.maps.event.clearInstanceListeners(polygon)

  polygon.setMap(null)
})

function setupPolygonEventListeners(polygon: google.maps.Polygon) {
  polygon.addListener('click', (event: google.maps.PolyMouseEvent) => emit('click', event))
  polygon.addListener('contextmenu', (event: google.maps.PolyMouseEvent) => emit('contextmenu', event))
  polygon.addListener('dblclick', (event: google.maps.PolyMouseEvent) => emit('dblclick', event))
  polygon.addListener('mousedown', (event: google.maps.PolyMouseEvent) => emit('mousedown', event))
  polygon.addListener('mousemove', (event: google.maps.PolyMouseEvent) => emit('mousemove', event))
  polygon.addListener('mouseout', (event: google.maps.PolyMouseEvent) => emit('mouseout', event))
  polygon.addListener('mouseover', (event: google.maps.PolyMouseEvent) => emit('mouseover', event))
  polygon.addListener('mouseup', (event: google.maps.PolyMouseEvent) => emit('mouseup', event))

  polygon.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event))
  polygon.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event))
  polygon.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event))
}
</script>
