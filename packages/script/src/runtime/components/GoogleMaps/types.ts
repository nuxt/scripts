/// <reference types="google.maps" />
import type { InjectionKey, ShallowRef } from 'vue'

export interface MarkerClustererInstance {
  render: () => void
  setMap: (map: google.maps.Map | null) => void
  addListener: (event: string, handler: () => void) => void
  addMarker: (marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker, noDraw?: boolean) => void
  removeMarker: (marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker, noDraw?: boolean) => boolean
}

export interface MarkerClustererOptions {
  markers?: google.maps.marker.AdvancedMarkerElement[]
  algorithm?: unknown
  renderer?: unknown
  onClusterClick?: unknown
}

export interface Cluster {
  marker: google.maps.marker.AdvancedMarkerElement
  markers?: google.maps.marker.AdvancedMarkerElement[]
  position: google.maps.LatLng
  bounds: google.maps.LatLngBounds | undefined
  count: number
}

export interface ClusterStats {
  markers: { sum: number }
  clusters: {
    count: number
    markers: { min: number, max: number, mean: number, sum: number }
  }
}

export interface MarkerClustererContext {
  markerClusterer: ShallowRef<MarkerClustererInstance | undefined>
  requestRerender: () => void
  /** Increments after each clustering cycle; watch to detect cluster membership changes */
  clusteringVersion: ShallowRef<number>
}

export const MARKER_CLUSTERER_INJECTION_KEY = Symbol('marker-clusterer') as InjectionKey<MarkerClustererContext>
