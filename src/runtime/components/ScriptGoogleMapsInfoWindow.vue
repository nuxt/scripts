<template>
  <div class="info-window-container">
    <div ref="info-window-container">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onUnmounted, useTemplateRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MARKER_INJECTION_KEY } from './ScriptGoogleMapsMarker.vue'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './ScriptGoogleMapsAdvancedMarkerElement.vue'

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
const advancedMarkerElementContext = inject(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, undefined)

const infoWindowContainer = useTemplateRef('info-window-container')

let infoWindow: google.maps.InfoWindow | undefined = undefined

whenever(
  () => mapContext?.map.value
    && mapContext.mapsApi.value
    && infoWindowContainer.value,
  () => {
    infoWindow = new mapContext!.mapsApi.value!.InfoWindow({
      content: infoWindowContainer.value,
      ...props.options,
    })

    setupInfoWindowEventListeners(infoWindow)

    if (markerContext?.marker.value) {
      markerContext.marker.value.addListener('click', () => {
        infoWindow!.open({
          anchor: markerContext.marker.value,
          map: mapContext!.map.value,
        })
      })
    }
    else if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      advancedMarkerElementContext.advancedMarkerElement.value.addListener('click', () => {
        infoWindow!.open({
          anchor: advancedMarkerElementContext.advancedMarkerElement.value,
          map: mapContext!.map.value,
        })
      })
    }
    else {
      infoWindow.setPosition(props.options?.position)

      infoWindow.open(mapContext!.map.value)
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
  if (!infoWindow || !mapContext?.mapsApi.value) {
    return
  }

  mapContext.mapsApi.value.event.clearInstanceListeners(infoWindow)

  infoWindow.close()
})

function setupInfoWindowEventListeners(infoWindow: google.maps.InfoWindow) {
  infoWindowEvents.forEach((event) => {
    infoWindow.addListener(event, () => emit(event))
  })
}
</script>

<style scoped>
.info-window-container {
    display: none;
}
</style>
