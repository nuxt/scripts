<script setup lang="ts">
import { inject, useTemplateRef, watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
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

// Track click listener on parent marker so it can be removed on cleanup
let markerClickListener: google.maps.MapsEventListener | undefined

const infoWindow = useGoogleMapsResource<google.maps.InfoWindow>({
  ready: () => !!infoWindowContainer.value,
  create({ mapsApi, map }) {
    const iw = new mapsApi.InfoWindow({
      content: infoWindowContainer.value,
      ...props.options,
    })

    bindGoogleMapsEvents(iw, emit, { noPayload: infoWindowEvents })

    if (markerContext?.marker.value) {
      markerClickListener = markerContext.marker.value.addListener('click', () => {
        iw.open({
          anchor: markerContext.marker.value,
          map,
        })
      })
    }
    else if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      markerClickListener = advancedMarkerElementContext.advancedMarkerElement.value.addListener('click', () => {
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
    markerClickListener?.remove()
    markerClickListener = undefined
    mapsApi.event.clearInstanceListeners(iw)
    iw.close()
  },
})

watch(() => props.options, (options) => {
  if (infoWindow.value && options) {
    infoWindow.value.setOptions(options)
  }
}, { deep: true })
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
