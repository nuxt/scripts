import type { InjectionKey, Ref, ShallowRef } from 'vue'

export const MAP_INJECTION_KEY = Symbol('map') as InjectionKey<{
  map: ShallowRef<google.maps.Map | undefined>
  mapsApi: Ref<typeof google.maps | undefined>
  /** Close the previously active InfoWindow and register a new one as active */
  activateInfoWindow: (iw: google.maps.InfoWindow) => void
}>

export const MARKER_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  advancedMarkerElement: ShallowRef<google.maps.marker.AdvancedMarkerElement | undefined>
}>
