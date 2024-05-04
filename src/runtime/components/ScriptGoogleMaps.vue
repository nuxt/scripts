<script lang="ts" setup>
/// <reference types="google.maps" />
import { computed, ref, watch } from 'vue'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useElementScriptTrigger, useRuntimeConfig, useScriptGoogleMaps } from '#imports'

const props = defineProps<{
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  /**
   * Defines the Google Maps API key. Must have access to the Static Maps API as well.
   */
  apiKey: string
  /**
   * Defines map marker location.
   */
  query?: string
  /**
   * Options for the map.
   */
  options?: Omit<google.maps.MapOptions, 'center'>
  /**
   * Defines the width of the map.
   */
  width?: number
  /**
   * Defines the height of the map
   */
  height?: number
}>()

const apiKey = props.apiKey || useRuntimeConfig().public.scripts?.googleMaps?.apikey

if (!apiKey)
  throw new Error('GoogleMaps requires an API key')
if (!props.query && !props.options?.center)
  throw new Error('GoogleMaps requires either a query or center option')

const elMap = ref<HTMLElement>()

const { $script } = useScriptGoogleMaps({
  apiKey: props.apiKey,
  scriptOptions: {
    trigger: useElementScriptTrigger({ trigger: props.trigger, el: elMap }),
  },
})

const options = computed(() => {
  return defu(props.options, {
    zoom: 15,
    mapId: 'map',
  })
})
const ready = ref(false)

function queryMaps(maps: google.maps, marker: google.maps.MarkerLibrary, map: google.maps.Map) {
  const request = {
    query: props.query,
    fields: ['name', 'geometry'],
  }
  const markers: google.maps.AdvancedMarkerElement[] = []
  const service = new maps.places.PlacesService(map)
  service.findPlaceFromQuery(request, (results, status) => {
    if (status === maps.places.PlacesServiceStatus.OK && results) {
      for (let i = 0; i < results.length; i++) {
        const location = results[i].geometry?.location
        location && markers.push(
          new marker.AdvancedMarkerElement({
            map,
            position: location,
          }),
        )
      }

      if (results[0].geometry?.location)
        markers[0] && map.setCenter(results[0].geometry.location)
      ready.value = true
    }
  })
}

// create the map
$script.then(async (instance) => {
  const maps = await instance.maps
  const marker = await maps.importLibrary('marker') as google.maps.MarkerLibrary

  const mapDiv = document.createElement('div')
  mapDiv.style.width = '100%'
  mapDiv.style.height = '100%'
  const _ = watch(ready, (v) => {
    v && elMap.value?.appendChild(mapDiv)
    _()
  })

  const map = new maps.Map(mapDiv, options.value)
  watch(options, () => map.setOptions(options.value))
  watch(() => props.query, () => {
    queryMaps(maps, marker, map)
  }, {
    immediate: !!props.query,
  })
  if (!props.query)
    ready.value = true
})

const poster = computed(() => {
  return withQuery('https://maps.googleapis.com/maps/api/staticmap', {
    center: props.query, // will be overriden by options if they were set
    size: `${props.width}x${props.height}`,
    key: apiKey,
    scale: 2, // we assume a high DPI to avoid hydration issues
    ...options.value,
  })
})
</script>

<template>
  <div ref="elMap" :style="{ width: `${width}px`, height: `${height}px`, position: 'relative' }">
    <slot>
      <img v-if="!ready" :src="poster" title="" :width="width" :height="height">
    </slot>
  </div>
</template>
