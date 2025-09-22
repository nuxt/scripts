<template>
</template>

<script setup lang="ts">
import { inject, shallowRef } from 'vue'
import { whenever } from '@vueuse/core'
import { MAP_INJECTION_KEY } from './ScriptGoogleMaps.vue'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY } from './ScriptGoogleMapsAdvancedMarkerElement.vue'

const props = defineProps<{
  options?: Omit<google.maps.marker.PinElementOptions, 'map'>
}>()

const mapContext = inject(MAP_INJECTION_KEY, undefined)
const advancedMarkerElementContext = inject(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, undefined)

const pinElement = shallowRef<google.maps.marker.PinElement | undefined>(undefined)

whenever(
  () =>
    mapContext?.map.value
    && mapContext.mapsApi.value
    && advancedMarkerElementContext?.advancedMarkerElement.value,
  async () => {
    await mapContext!.mapsApi.value!.importLibrary('marker')

    pinElement.value = new mapContext!.mapsApi.value!.marker.PinElement(props.options)

    if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      advancedMarkerElementContext.advancedMarkerElement.value.content = pinElement.value.element
    }

    whenever(() => props.options, (options) => {
      if (pinElement.value && options) {
        Object.assign(pinElement.value, options)
      }
    }, {
      deep: true,
    })
  }, {
    immediate: true,
    once: true,
  },
)
</script>
