<template>
</template>

<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: Omit<google.maps.RectangleOptions, 'map'>
}>()

const emit = defineEmits<{
  (event:
    | 'bounds_changed'
  ): void
  (event:
    | 'click'
    | 'contextmenu'
    | 'dblclick'
    | 'drag'
    | 'dragend'
    | 'dragstart'
    | 'mousedown'
    | 'mousemove'
    | 'mouseout'
    | 'mouseover'
    | 'mouseup',
    payload: google.maps.MapMouseEvent
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)

let rectangle: google.maps.Rectangle | undefined = undefined

whenever(() => mapContext?.map.value, (map) => {
  rectangle = new google.maps.Rectangle({
    map,
    ...props.options,
  })

  setupRectangleEventListeners(rectangle)

  whenever(() => props.options, (options) => {
    rectangle?.setOptions(options)
  }, {
    deep: true,
  })
}, {
  immediate: true,
  once: true,
})

onUnmounted(() => {
  if (!rectangle) {
    return
  }

  google.maps.event.clearInstanceListeners(rectangle)

  rectangle.setMap(null)
})

function setupRectangleEventListeners(rectangle: google.maps.Rectangle) {
  rectangle.addListener('bounds_changed', () => emit('bounds_changed'))

  rectangle.addListener('click', (event: google.maps.MapMouseEvent) => emit('click', event))
  rectangle.addListener('contextmenu', (event: google.maps.MapMouseEvent) => emit('contextmenu', event))
  rectangle.addListener('dblclick', (event: google.maps.MapMouseEvent) => emit('dblclick', event))
  rectangle.addListener('drag', (event: google.maps.MapMouseEvent) => emit('drag', event))
  rectangle.addListener('dragend', (event: google.maps.MapMouseEvent) => emit('dragend', event))
  rectangle.addListener('dragstart', (event: google.maps.MapMouseEvent) => emit('dragstart', event))
  rectangle.addListener('mousedown', (event: google.maps.MapMouseEvent) => emit('mousedown', event))
  rectangle.addListener('mousemove', (event: google.maps.MapMouseEvent) => emit('mousemove', event))
  rectangle.addListener('mouseout', (event: google.maps.MapMouseEvent) => emit('mouseout', event))
  rectangle.addListener('mouseover', (event: google.maps.MapMouseEvent) => emit('mouseover', event))
  rectangle.addListener('mouseup', (event: google.maps.MapMouseEvent) => emit('mouseup', event))
}
</script>
