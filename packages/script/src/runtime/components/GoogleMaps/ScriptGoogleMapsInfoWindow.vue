<script setup lang="ts">
import { inject, useTemplateRef, watch } from 'vue'
import { bindGoogleMapsEvents, MAP_INJECTION_KEY, MARKER_INJECTION_KEY, useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  /**
   * Configuration options for the info window.
   * @see https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindowOptions
   */
  options?: google.maps.InfoWindowOptions
}>()

const emit = defineEmits<{
  /**
   * Fired when the info window is closed. Includes both user and programmatic close actions.
   * @see https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.close
   */
  close: []
  /**
   * Fired when the close button is clicked.
   * @see https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.closeclick
   */
  closeclick: []
  /**
   * Fired when the content of the info window changes.
   */
  content_changed: []
  /**
   * Fired when the info window's `<div>` is attached to the DOM. Useful for computing dynamic content sizing.
   * @see https://developers.google.com/maps/documentation/javascript/reference/info-window#InfoWindow.domready
   */
  domready: []
  /**
   * Fired when the header content of the info window changes.
   */
  headercontent_changed: []
  /**
   * Fired when the header disabled state changes.
   */
  headerdisabled_changed: []
  /**
   * Fired when the info window position changes.
   */
  position_changed: []
  /**
   * Fired when the info window becomes visible.
   */
  visible: []
  /**
   * Fired when the z-index of the info window changes.
   */
  zindex_changed: []
}>()

defineSlots<{
  default?: () => any
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

const infoWindowContainer = useTemplateRef('info-window-container')

// Track click listener on parent marker so it can be removed on cleanup
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
    iw.addListener('closeclick', () => {
      isOpen = false
    })
    iw.addListener('close', () => {
      isOpen = false
    })

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

    if (markerContext?.advancedMarkerElement.value) {
      const ame = markerContext.advancedMarkerElement.value
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
    if (gmpClickHandler && markerContext?.advancedMarkerElement.value) {
      markerContext.advancedMarkerElement.value.removeEventListener('gmp-click', gmpClickHandler)
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
