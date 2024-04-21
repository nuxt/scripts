<script lang="ts" setup>
import { type PropType, computed, ref, watch } from 'vue'
import { withQuery } from 'ufo'
import type google from 'google.maps'
import { defu } from 'defu'
import { useRuntimeConfig, useScriptGoogleMaps } from '#imports'

const props = defineProps({
  /**
   * Defines the Google Maps API key. Must have access to the Static Maps API as well.
   *
   * @see https://developers.google.com/maps/documentation/javascript/get-api-key
   */
  apiKey: { type: String, required: true },
  /**
   * Defines map marker location.
   *
   * @example City Hall, New York, NY
   */
  query: { type: String, required: false, default: '' },
  /**
   * Defines center of the map view.
   *
   * @example 37.4218,-122.0840
   */
  options: { type: Object as PropType<Omit<google.maps.MapOptions, 'center'>>, required: false, default: undefined },
  /**
   * Defines the width of the map.
   */
  width: { type: Number, required: false, default: 500 },
  /**
   * Defines the height of the map
   */
  height: { type: Number, required: false, default: 400 },
})

const apiKey = props.apiKey || useRuntimeConfig().public.scripts?.googleMaps

if (!apiKey)
  throw new Error('GoogleMaps requires an API key')
if (!props.query && !props.options?.center)
  throw new Error('GoogleMaps requires either a query or center option')

const wasHovered = ref(false)
const hoverPromise = new Promise<void>((resolve) => {
  watch(wasHovered, val => val && resolve())
})

const { $script } = useScriptGoogleMaps({
  apiKey: props.apiKey,
}, {
  trigger: hoverPromise,
})

const elMap = ref<HTMLElement>()

const options = computed(() => {
  return defu(props.options, {
    zoom: 15,
    mapId: 'map',
  })
})

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

const ready = ref(false)
// create the map
$script.then(async (instance) => {
  const maps = await instance.maps
  const marker = await maps.importLibrary('marker') as google.maps.MarkerLibrary

  const mapDiv = document.createElement('div')
  mapDiv.style.width = '100%'
  mapDiv.style.height = '100%'
  elMap.value?.appendChild(mapDiv)

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

// if we have a query apply it

// if (props.q) {
//   const result = createMapWithQuery({ zoom: props.zoom, mapRef, q: props.q })
//   map = result.map
//   return
// }
//
// if (props.center) {
//   const result = createMapWithCenter({ zoom: props.zoom, mapRef, center: props.center })
//   map = result.map
// }

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
  <div ref="elMap" :style="{ width: `${width}px`, height: `${height}px`, 'position': 'relative' }" @mouseover="wasHovered = true">
    <slot>
      <img v-if="!ready" :src="poster" title="" :width="width" :height="height">
    </slot>
  </div>
</template>
