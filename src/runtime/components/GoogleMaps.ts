import type { PropType, Ref } from 'vue'
import { defineComponent, h, ref, watch } from 'vue'
import type google from 'google.maps'
import { useScriptGoogleMaps } from '#imports'

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

/**
 * validateEitherOrOptions
 *
 * Checks the options object if either 'a' or 'b' param are present.
 * It returns early, if a script with the same key was already injected.
 *
 * @param key string - represents the key of the script that's injected in the head.
 * @param options object - data to check for keys 'a' or 'b' to be present.
 * @param a string - first option to check for.
 * @param b string - second option to check for.
 */
export function validateEitherOrOptions<T extends Record<string, any>>(key: string, options: T, a: string, b: string): void {
  if (options[a] && options[b])
    throw new Error(`${key} only requires one of these options: ${a} or ${b} }`)
  if (!options[a] && !options[b])
    throw new Error(`${key} requires one of these options: ${a} or ${b} }`)
}

/**
 * GoogleMaps
 *
 * A 3P wrapper component that takes the props to define and build the component.
 */
const GoogleMaps = defineComponent({
  name: 'GoogleMaps',
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
    validateEitherOrOptions(id, props, 'q', 'center')
    const mapRef = ref<HTMLElement>()

    const { $script } = useScriptGoogleMaps({
      apiKey: props.apiKey,
    }, {
      trigger: 'onNuxtReady',
    })

    let map: google.maps.Map

    $script.then(({ maps }) => {
      function createMap({ options, mapRef }: MapInput): google.maps.Map {
        const mapDiv = document.createElement('div')
        mapDiv.style.width = '100%'
        mapDiv.style.height = '100%'
        mapRef.value.appendChild(mapDiv)

        return new maps.Map(mapDiv, {
          ...options,
        })
      }

      function createMarker({ position, map }: MarkerInput) {
        if (!position)
          return

        return new maps.Marker({
          map,
          position,
        })
      }

      function queryMaps(map: google.maps.Map, q: string) {
        const request = {
          query: q,
          fields: ['name', 'geometry'],
        }

        const markers: google.maps.Marker[] = []
        const service = new maps.places.PlacesService(map)
        service.findPlaceFromQuery(request, (results, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && results) {
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

      if (props.q) {
        const result = createMapWithQuery({ zoom: props.zoom, mapRef, q: props.q })
        map = result.map
        return
      }

      if (props.center) {
        const result = createMapWithCenter({ zoom: props.zoom, mapRef, center: props.center })
        map = result.map
      }

      if (import.meta.client)
        watch(props, () => updateMap({ map, center: props.center, q: props.q }))
    })

    return () => h('div', { class: 'google-maps-container', ref: mapRef })
  },
})

export default GoogleMaps
