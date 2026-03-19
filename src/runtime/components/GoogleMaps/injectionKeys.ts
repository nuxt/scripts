import type { InjectionKey, Ref, ShallowRef } from 'vue'

export const MAP_INJECTION_KEY = Symbol('map') as InjectionKey<{
  map: ShallowRef<google.maps.Map | undefined>
  mapsApi: Ref<typeof google.maps | undefined>
}>

export const ADVANCED_MARKER_ELEMENT_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  advancedMarkerElement: ShallowRef<google.maps.marker.AdvancedMarkerElement | undefined>
}>

export const MARKER_INJECTION_KEY = Symbol('marker') as InjectionKey<{
  marker: ShallowRef<google.maps.Marker | undefined>
}>
