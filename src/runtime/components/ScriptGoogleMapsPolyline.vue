<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.PolylineOptions, 'map'>
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

let polyline: google.maps.Polyline | undefined = undefined

whenever(() => mapContext?.map.value, (map) => {
  polyline = new google.maps.Polyline({
    map,
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
  if (!polyline) {
    return
  }

  google.maps.event.clearInstanceListeners(polyline)

  polyline.setMap(null)
})

function setupPolylineEventListeners(polyline: google.maps.Polyline) {
  polyline.addListener('click', (event: google.maps.PolyMouseEvent) => emit('click', event))
  polyline.addListener('contextmenu', (event: google.maps.PolyMouseEvent) => emit('contextmenu', event))
  polyline.addListener('dblclick', (event: google.maps.PolyMouseEvent) => emit('dblclick', event))
  polyline.addListener('mousedown', (event: google.maps.PolyMouseEvent) => emit('mousedown', event))
  polyline.addListener('mousemove', (event: google.maps.PolyMouseEvent) => emit('mousemove', event))
  polyline.addListener('mouseout', (event: google.maps.PolyMouseEvent) => emit('mouseout', event))
  polyline.addListener('mouseover', (event: google.maps.PolyMouseEvent) => emit('mouseover', event))
  polyline.addListener('mouseup', (event: google.maps.PolyMouseEvent) => emit('mouseup', event))

  polyline.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event))
  polyline.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event))
  polyline.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event))
}
</script>
