<script setup lang="ts">
import { inject, useTemplateRef, watch } from 'vue'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY, MARKER_INJECTION_KEY } from './injectionKeys'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: google.maps.InfoWindowOptions
}>()

const emit = defineEmits<{
  (event: typeof infoWindowEvents[number]): void
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

const markerContext = inject(MARKER_INJECTION_KEY, undefined)
const advancedMarkerElementContext = inject(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, undefined)

const infoWindowContainer = useTemplateRef('info-window-container')

const infoWindow = useGoogleMapsResource<google.maps.InfoWindow>({
  ready: () => !!infoWindowContainer.value,
  create({ mapsApi, map }) {
    const iw = new mapsApi.InfoWindow({
      content: infoWindowContainer.value,
      ...props.options,
    })

    setupEventListeners(iw)

    if (markerContext?.marker.value) {
      markerContext.marker.value.addListener('click', () => {
        iw.open({
          anchor: markerContext.marker.value,
          map,
        })
      })
    }
    else if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      advancedMarkerElementContext.advancedMarkerElement.value.addListener('click', () => {
        iw.open({
          anchor: advancedMarkerElementContext.advancedMarkerElement.value,
          map,
        })
      })
    }
    else {
      iw.setPosition(props.options?.position)
      iw.open(map)
    }

    return iw
  },
  cleanup(iw, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(iw)
    iw.close()
  },
})

watch(() => props.options, (options) => {
  if (infoWindow.value && options) {
    infoWindow.value.setOptions(options)
  }
}, { deep: true })

function setupEventListeners(iw: google.maps.InfoWindow) {
  infoWindowEvents.forEach((event) => {
    iw.addListener(event, () => emit(event))
  })
}
</script>

<template>
  <div class="info-window-container">
    <div ref="info-window-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.info-window-container {
    display: none;
}
</style>
