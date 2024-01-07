/// <reference types="google.maps" />
import { defineComponent, h, ref, watch } from 'vue'
import type { PropType, Ref } from 'vue'
import { formatDimensionValue, validateEitherOrOptions, validateRequiredOptions } from '../util'
import { useGoogleMaps } from '../composables/googleMaps'

interface LatLng {
  lat: number
  lng: number
}

interface MapInput {
  options: google.maps.MapOptions
  mapRef: Ref
}

interface MarkerInput {
  position: LatLng | undefined
  map: google.maps.Map
}

interface BaseCreateInput {
  zoom: number
  mapRef: Ref
}

type CreateMapWithCenterInput = BaseCreateInput & {
  center: LatLng
}

type CreateMapWithQueryInput = BaseCreateInput & {
  q: string
}

interface UpdateMapInput {
  map: google.maps.Map
  center: LatLng | undefined
  q: string
}

function createMap({ options, mapRef }: MapInput) {
  const mapDiv = document.createElement('div')
  mapDiv.style.width = '100%'
  mapDiv.style.height = '100%'
  mapRef.value.appendChild(mapDiv)

  const map = new google.maps.Map(mapDiv, {
    ...options,
  })

  return map
}

function createMarker({ position, map }: MarkerInput) {
  if (!position)
    return

  const marker = new google.maps.Marker({
    map,
    position,
  })

  return marker
}

function queryMaps(map: google.maps.Map, q: string) {
  const request = {
    query: q,
    fields: ['name', 'geometry'],
  }

  const markers: google.maps.Marker[] = []
  const service = new google.maps.places.PlacesService(map)
  service.findPlaceFromQuery(request, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
      for (let i = 0; i < results.length; i++) {
        const location = results[i].geometry?.location as unknown as LatLng
        const marker = createMarker({ position: location, map })
        if (marker)
          markers.push(marker)
      }

      if (results[0].geometry?.location)
        map.setCenter(results[0].geometry.location)
    }
  })
}

function updateMap({ map, center, q }: UpdateMapInput) {
  if (center) {
    map.setCenter(center)
    return
  }

  queryMaps(map, q)
}

function createMapWithQuery({ zoom, q, mapRef }: CreateMapWithQueryInput) {
  const map = createMap({
    options: {
      zoom,
    },
    mapRef,
  })

  queryMaps(map, q)

  return ({ map })
}

function createMapWithCenter({ zoom, center, mapRef }: CreateMapWithCenterInput) {
  const map: google.maps.Map = createMap({
    options: {
      ...(center && { center }),
      zoom,
    },
    mapRef,
  })

  return ({ map })
}

export const GoogleMapsJavaScriptApi = defineComponent({
  name: 'GoogleMapsJavaScriptApi',
  props: {
    apiKey: { type: String, required: true },
    /**
     * Defines map marker location.
     *
     * @example City Hall, New York, NY
     */
    q: { type: String, required: false, default: '' },
    /**
     * Defines center of the map view.
     *
     * @example 37.4218,-122.0840
     */
    center: { type: Object as PropType<LatLng>, required: false, default: undefined },
    /**
     * Sets initial zoom level of the map.
     *
     * @example 10
     */
    zoom: { type: Number, required: false, default: 15 },
    /**
     * Defines the width of the map.
     */
    width: { type: String, required: false, default: '100%' },
    /**
     * Defines the height of the map
     */
    height: { type: String, required: false, default: '100%' },
  },
  setup(props) {
    const id = 'google-maps-api'
    validateRequiredOptions(id, props, ['apiKey'])
    validateEitherOrOptions(id, props, 'q', 'center')
    const mapRef = ref<HTMLElement>()

    const { $script } = useGoogleMaps({
      apiKey: props.apiKey,
      trigger: 'idle',
      skipEarlyConnections: true,
    })

    let map: google.maps.Map

    $script.waitForLoad().then(() => {
      if (props.q) {
        const result = createMapWithQuery({ zoom: props.zoom, mapRef, q: props.q })
        map = result.map
        return
      }

      if (props.center) {
        const result = createMapWithCenter({ zoom: props.zoom, mapRef, center: props.center })
        map = result.map
      }
    })

    if (import.meta.client)
      watch(props, () => updateMap({ map, center: props.center, q: props.q }))

    return () => h('div', { class: 'google-maps-container', ref: mapRef, style: { width: formatDimensionValue(props.width), height: formatDimensionValue(props.height) } })
  },
})

export default GoogleMapsJavaScriptApi
