<script setup lang="ts">
import { inject, watch } from 'vue'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './injectionKeys'
import { useGoogleMapsResource } from './useGoogleMapsResource'

const props = defineProps<{
  options?: Omit<google.maps.marker.PinElementOptions, 'map'>
}>()

const advancedMarkerElementContext = inject(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, undefined)

const pinElement = useGoogleMapsResource<google.maps.marker.PinElement>({
  ready: () => !!advancedMarkerElementContext?.advancedMarkerElement.value,
  async create({ mapsApi }) {
    await mapsApi.importLibrary('marker')
    const pin = new mapsApi.marker.PinElement(props.options)
    if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      advancedMarkerElementContext.advancedMarkerElement.value.content = pin.element
    }
    return pin
  },
  cleanup() {
    if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      advancedMarkerElementContext.advancedMarkerElement.value.content = null
    }
  },
})

watch(() => props.options, (options) => {
  if (pinElement.value && options) {
    Object.assign(pinElement.value, options)
  }
}, { deep: true })
</script>

<template>
</template>
