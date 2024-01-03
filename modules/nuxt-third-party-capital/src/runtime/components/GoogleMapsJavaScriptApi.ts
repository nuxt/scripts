/// <reference types="google.maps" />
import { defineComponent, h, ref } from 'vue'
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
  position: LatLng
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

function createMapWithQuery({ zoom, q, mapRef }: CreateMapWithQueryInput) {
  const map = createMap({
    options: {
      zoom,
    },
    mapRef,
  })

  const request = {
    query: q,
    fields: ['name', 'geometry'],
  }

  const service = new google.maps.places.PlacesService(map)
  service.findPlaceFromQuery(request, (results: any, status: any) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
      for (let i = 0; i < results.length; i++)
        createMarker({ position: results[i].geometry.location, map })

      map.setCenter(results[0].geometry.location)
    }
  })
}

function createMapWithCenter({ zoom, center, mapRef }: CreateMapWithCenterInput) {
  const map: google.maps.Map = createMap({
    options: {
      ...(center && { center }),
      zoom,
    },
    mapRef,
  })

  createMarker({ position: center, map })
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

    const { zoom, center, q } = props

    $script.waitForLoad().then(() => {
      if (q)
        return createMapWithQuery({ zoom, mapRef, q })

      if (center)
        return createMapWithCenter({ zoom, mapRef, center })
    })

    return () => h('div', { class: 'google-maps-container', ref: mapRef, style: { width: formatDimensionValue(props.width), height: formatDimensionValue(props.height) } })
  },
})

export default GoogleMapsJavaScriptApi
