<template>
  <div
    v-show="false"
    ref="info-window-container"
    aria-hidden="true"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, onUnmounted, useTemplateRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MARKER_INJECTION_KEY } from './ScriptGoogleMapsMarker.vue'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'

const props = defineProps<{
  options?: google.maps.InfoWindowOptions
}>()

const emit = defineEmits<{
  (event:
    | 'close'
    | 'closeclick'
    | 'content_changed'
    | 'domready'
    | 'headercontent_changed'
    | 'headerdisabled_changed'
    | 'position_changed'
    | 'visible'
    | 'zindex_changed'
  ): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const markerContext = inject(MARKER_INJECTION_KEY, undefined)

const infoWindowContainer = useTemplateRef('info-window-container')

let infoWindow: google.maps.InfoWindow | undefined = undefined

const infoWindowListeners: google.maps.MapsEventListener[] = []

whenever(
  () => mapContext?.map.value
    && infoWindowContainer.value,
  () => {
    infoWindow = new google.maps.InfoWindow({
      content: infoWindowContainer.value!.firstElementChild || infoWindowContainer.value!.textContent,
      ...props.options,
    })

    infoWindowContainer.value!.parentElement?.removeChild(infoWindowContainer.value!)

    infoWindowListeners.push(...setupInfoWindowEventListeners(infoWindow))

    if (markerContext?.marker.value) {
      markerContext.marker.value.addListener('click', () => {
        infoWindow!.open({
          anchor: markerContext.marker.value,
          map: mapContext!.map.value,
        })
      })
    }
  }, {
    immediate: true,
    once: true,
  })

onUnmounted(() => {
  infoWindowListeners.forEach(listener => listener.remove())

  infoWindow?.close()
})

function setupInfoWindowEventListeners(infoWindow: google.maps.InfoWindow): google.maps.MapsEventListener[] {
  const listeners: google.maps.MapsEventListener[] = []

  listeners.push(infoWindow.addListener('close', () => emit('close')))
  listeners.push(infoWindow.addListener('closeclick', () => emit('closeclick')))
  listeners.push(infoWindow.addListener('content_changed', () => emit('content_changed')))
  listeners.push(infoWindow.addListener('domready', () => emit('domready')))
  listeners.push(infoWindow.addListener('headercontent_changed', () => emit('headercontent_changed')))
  listeners.push(infoWindow.addListener('headerdisabled_changed', () => emit('headerdisabled_changed')))
  listeners.push(infoWindow.addListener('position_changed', () => emit('position_changed')))
  listeners.push(infoWindow.addListener('visible', () => emit('visible')))
  listeners.push(infoWindow.addListener('zindex_changed', () => emit('zindex_changed')))

  return listeners
}
</script>
