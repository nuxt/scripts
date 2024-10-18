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

const infoWindowEvents = [
  'close',
  'closeclick',
  'content_changed',
  'domready',
  'headercontent_changed',
  'headerdisabled_changed',
  'position_changed',
  'visible',
  'zindex_changed',
] as const

const emit = defineEmits<{
  (event: typeof infoWindowEvents[number]): void
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const markerContext = inject(MARKER_INJECTION_KEY, undefined)

const infoWindowContainer = useTemplateRef('info-window-container')

let infoWindow: google.maps.InfoWindow | undefined = undefined

whenever(
  () => mapContext?.map.value
    && infoWindowContainer.value,
  () => {
    infoWindow = new google.maps.InfoWindow({
      content: infoWindowContainer.value!.firstElementChild || infoWindowContainer.value!.textContent,
      ...props.options,
    })

    infoWindowContainer.value!.parentElement?.removeChild(infoWindowContainer.value!)

    setupInfoWindowEventListeners(infoWindow)

    if (markerContext?.marker.value) {
      markerContext.marker.value.addListener('click', () => {
        infoWindow!.open({
          anchor: markerContext.marker.value,
          map: mapContext!.map.value,
        })
      })
    }
    else {
      infoWindow.setPosition(props.options?.position)

      infoWindow.open(mapContext?.map.value)
    }

    whenever(() => props.options, (options) => {
      infoWindow?.setOptions(options)
    }, {
      deep: true,
    })
  }, {
    immediate: true,
    once: true,
  })

onUnmounted(() => {
  if (!infoWindow) {
    return
  }

  google.maps.event.clearInstanceListeners(infoWindow)

  infoWindow.close()
})

function setupInfoWindowEventListeners(infoWindow: google.maps.InfoWindow) {
  infoWindowEvents.forEach((event) => {
    infoWindow.addListener(event, () => emit(event))
  })
}
</script>
