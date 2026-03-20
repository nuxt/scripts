<script setup lang="ts">
import { inject, useTemplateRef, watch } from 'vue'
import { bindGoogleMapsEvents } from './bindGoogleMapsEvents'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY, MAP_INJECTION_KEY, MARKER_INJECTION_KEY } from './injectionKeys'
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

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const markerContext = inject(MARKER_INJECTION_KEY, undefined)
const advancedMarkerElementContext = inject(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, undefined)

const infoWindowContainer = useTemplateRef('info-window-container')

// Track click listener on parent marker so it can be removed on cleanup
let markerClickListener: google.maps.MapsEventListener | undefined
let gmpClickHandler: ((e: any) => void) | undefined
let isOpen = false

const infoWindow = useGoogleMapsResource<google.maps.InfoWindow>({
  ready: () => !!infoWindowContainer.value,
  create({ mapsApi, map }) {
    const iw = new mapsApi.InfoWindow({
      content: infoWindowContainer.value,
      ...props.options,
    })

    // Track open state for toggle behavior
    iw.addListener('closeclick', () => { isOpen = false })
    iw.addListener('close', () => { isOpen = false })

    bindGoogleMapsEvents(iw, emit, { noPayload: infoWindowEvents })

    const toggleOpen = (anchor: any) => {
      if (isOpen) {
        iw.close()
        isOpen = false
      }
      else {
        mapContext?.activateInfoWindow(iw)
        iw.open({ anchor, map })
        isOpen = true
      }
    }

    if (markerContext?.marker.value) {
      markerClickListener = markerContext.marker.value.addListener('click', () => {
        toggleOpen(markerContext.marker.value)
      })
    }
    else if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      const ame = advancedMarkerElementContext.advancedMarkerElement.value
      ame.gmpClickable = true
      gmpClickHandler = () => toggleOpen(ame)
      ame.addEventListener('gmp-click', gmpClickHandler)
    }
    else {
      iw.setPosition(props.options?.position)
      iw.open(map)
      isOpen = true
    }

    return iw
  },
  cleanup(iw, { mapsApi }) {
    markerClickListener?.remove()
    markerClickListener = undefined
    if (gmpClickHandler && advancedMarkerElementContext?.advancedMarkerElement.value) {
      advancedMarkerElementContext.advancedMarkerElement.value.removeEventListener('gmp-click', gmpClickHandler)
      gmpClickHandler = undefined
    }
    mapsApi.event.clearInstanceListeners(iw)
    iw.close()
    isOpen = false
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
