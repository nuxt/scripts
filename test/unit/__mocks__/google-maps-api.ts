import { vi } from 'vitest'

export const createMockMarker = () => ({
  setOptions: vi.fn(),
  setMap: vi.fn(),
  addListener: vi.fn(),
})

export const createMockAdvancedMarkerElement = () => ({
  map: null,
  content: null,
  position: null,
  addListener: vi.fn(),
})

export const createMockInfoWindow = () => ({
  setOptions: vi.fn(),
  setPosition: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  addListener: vi.fn(),
})

export const createMockPinElement = () => ({
  element: document.createElement('div'),
})

export const createMockMarkerClusterer = () => ({
  addMarker: vi.fn(),
  removeMarker: vi.fn(),
  setMap: vi.fn(),
  addListener: vi.fn(),
  render: vi.fn(),
})

export const createMockGoogleMapsAPI = () => {
  const mockMarker = createMockMarker()
  const mockAdvancedMarkerElement = createMockAdvancedMarkerElement()
  const mockInfoWindow = createMockInfoWindow()
  const mockPinElement = createMockPinElement()
  const mockMarkerClusterer = createMockMarkerClusterer()

  const mockMapsApi = {
    Marker: vi.fn(() => mockMarker),
    marker: {
      AdvancedMarkerElement: vi.fn(() => mockAdvancedMarkerElement),
      PinElement: vi.fn(() => mockPinElement),
    },
    InfoWindow: vi.fn(() => mockInfoWindow),
    event: {
      clearInstanceListeners: vi.fn(),
    },
    importLibrary: vi.fn().mockResolvedValue({
      AdvancedMarkerElement: vi.fn(() => mockAdvancedMarkerElement),
      PinElement: vi.fn(() => mockPinElement),
    }),
    LatLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
  }

  return {
    mockMarker,
    mockAdvancedMarkerElement,
    mockInfoWindow,
    mockMarkerClusterer,
    mockPinElement,
    mockMapsApi,
  }
}

// Standard event types used across components
export const MARKER_EVENTS_WITHOUT_PAYLOAD = [
  'animation_changed',
  'clickable_changed',
  'cursor_changed',
  'draggable_changed',
  'flat_changed',
  'icon_changed',
  'position_changed',
  'shape_changed',
  'title_changed',
  'visible_changed',
  'zindex_changed',
] as const

export const MARKER_EVENTS_WITH_MOUSE_EVENT = [
  'click',
  'contextmenu',
  'dblclick',
  'drag',
  'dragend',
  'dragstart',
  'mousedown',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

export const INFO_WINDOW_EVENTS = [
  'close',
  'closeclick',
  'content_changed',
  'domready',
  'headercontent_changed',
  'headerdisabled_changed',
  'position_changed',
  'visible',
  'zindex_changed',
] as const

export const MARKER_CLUSTERER_EVENTS = [
  'click',
  'clusteringbegin',
  'clusteringend',
] as const
