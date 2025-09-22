import { vi } from 'vitest'
import { ref } from 'vue'
import type { createMockGoogleMapsAPI } from '../__mocks__/google-maps-api'

export type MocksType = ReturnType<typeof createMockGoogleMapsAPI>

/**
 * Creates a mock map context that components would inject
 */
export const createMockMapContext = (mocks: MocksType) => ({
  map: ref({}),
  mapsApi: ref(mocks.mockMapsApi),
})

/**
 * Simulates the component lifecycle for markers
 */
export const simulateMarkerLifecycle = (mocks: MocksType, options: any) => {
  // Creation
  const marker = new mocks.mockMapsApi.Marker(options)

  // Event listener setup (simulate what components do)
  marker.addListener('click', vi.fn())
  marker.addListener('position_changed', vi.fn())

  // Map assignment
  marker.setMap(ref({}).value)

  // Options update
  const newOptions = { ...options, title: 'Updated' }
  marker.setOptions(newOptions)

  // Cleanup
  mocks.mockMapsApi.event.clearInstanceListeners(marker)
  marker.setMap(null)

  return marker
}

/**
 * Simulates the component lifecycle for advanced markers
 */
export const simulateAdvancedMarkerLifecycle = async (mocks: MocksType, options: any) => {
  // Library import (required for advanced markers)
  await mocks.mockMapsApi.importLibrary('marker')

  // Creation
  const advancedMarker = new mocks.mockMapsApi.marker.AdvancedMarkerElement(options)

  // Event listener setup
  advancedMarker.addListener('click', vi.fn())
  advancedMarker.addListener('position_changed', vi.fn())

  // Map assignment
  advancedMarker.map = ref({}).value

  // Options update using Object.assign (as components do)
  const newOptions = { position: { lat: 20, lng: 30 } }
  Object.assign(advancedMarker, newOptions)

  // Cleanup
  mocks.mockMapsApi.event.clearInstanceListeners(advancedMarker)
  advancedMarker.map = null

  return advancedMarker
}

/**
 * Simulates info window lifecycle and attachment patterns
 */
export const simulateInfoWindowLifecycle = (mocks: MocksType, options: any) => {
  // Create DOM element for content
  const contentElement = document.createElement('div')
  contentElement.innerHTML = '<p>Test content</p>'

  // Creation with content
  const infoWindow = new mocks.mockMapsApi.InfoWindow({
    content: contentElement,
    ...options,
  })

  // Event listener setup
  infoWindow.addListener('close', vi.fn())
  infoWindow.addListener('domready', vi.fn())

  // Opening on map
  infoWindow.open({ map: ref({}).value, anchor: undefined })

  // Cleanup
  mocks.mockMapsApi.event.clearInstanceListeners(infoWindow)
  infoWindow.close()

  return { infoWindow, contentElement }
}

/**
 * Simulates marker clusterer with multiple markers
 */
export const simulateMarkerClustererLifecycle = async (mocks: MocksType, options: any = {}) => {
  const { MarkerClusterer } = await import('@googlemaps/markerclusterer')

  // Create clusterer
  const clusterer = new MarkerClusterer({
    map: ref({}).value,
    ...options,
  })

  // Add multiple markers
  const markers = [
    new mocks.mockMapsApi.Marker({ position: { lat: 1, lng: 1 } }),
    new mocks.mockMapsApi.Marker({ position: { lat: 2, lng: 2 } }),
    new mocks.mockMapsApi.Marker({ position: { lat: 3, lng: 3 } }),
  ]

  markers.forEach((marker) => {
    clusterer.addMarker(marker)
  })

  // Simulate marker removal
  clusterer.removeMarker(markers[0], true)

  // Trigger rerender
  clusterer.render()

  // Event listeners
  clusterer.addListener('clusteringbegin', vi.fn())
  clusterer.addListener('clusteringend', vi.fn())

  // Cleanup
  clusterer.setMap(null)

  return { clusterer, markers }
}

/**
 * Test options for various Google Maps objects
 */
export const TEST_OPTIONS = {
  marker: {
    position: { lat: -33.8688, lng: 151.2093 },
    title: 'Test Marker',
    draggable: true,
  },
  advancedMarker: {
    position: { lat: -33.8688, lng: 151.2093 },
    title: 'Advanced Test Marker',
  },
  infoWindow: {
    position: { lat: -33.8688, lng: 151.2093 },
    maxWidth: 300,
  },
  clusterer: {
    gridSize: 60,
    maxZoom: 15,
  },
  pin: {
    scale: 1.5,
    background: '#FF0000',
  },
} as const
