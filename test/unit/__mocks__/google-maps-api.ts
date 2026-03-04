import { vi } from 'vitest'

export function createMockMarker() {
  return {
    setOptions: vi.fn(),
    setMap: vi.fn(),
    addListener: vi.fn(),
  }
}

export function createMockAdvancedMarkerElement() {
  return {
    map: null,
    content: null,
    position: null,
    addListener: vi.fn(),
  }
}

export function createMockInfoWindow() {
  return {
    setOptions: vi.fn(),
    setPosition: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    addListener: vi.fn(),
  }
}

export function createMockPinElement() {
  return {
    element: document.createElement('div'),
  }
}

export function createMockMarkerClusterer() {
  return {
    addMarker: vi.fn(),
    removeMarker: vi.fn(),
    setMap: vi.fn(),
    addListener: vi.fn(),
    render: vi.fn(),
  }
}

// Class-based mocks for Vitest 4 constructor support - returns shared instance
function createMockClass<T>(instance: T) {
  // eslint-disable-next-line prefer-arrow-callback
  const MockClass = vi.fn(function () {
    return instance
  }) as unknown as (new (...args: any[]) => T) & ReturnType<typeof vi.fn>
  return MockClass
}

export function createMockGoogleMapsAPI() {
  const mockMarker = createMockMarker()
  const mockAdvancedMarkerElement = createMockAdvancedMarkerElement()
  const mockInfoWindow = createMockInfoWindow()
  const mockPinElement = createMockPinElement()
  const mockMarkerClusterer = createMockMarkerClusterer()

  const MockMarker = createMockClass(mockMarker)
  const MockAdvancedMarkerElement = createMockClass(mockAdvancedMarkerElement)
  const MockPinElement = createMockClass(mockPinElement)
  const MockInfoWindow = createMockClass(mockInfoWindow)
  // eslint-disable-next-line prefer-arrow-callback
  const MockLatLng = vi.fn(function (this: any, lat: number, lng: number) {
    return { lat, lng }
  }) as unknown as (new (lat: number, lng: number) => { lat: number, lng: number }) & ReturnType<typeof vi.fn>

  const mockMapsApi = {
    Marker: MockMarker,
    marker: {
      AdvancedMarkerElement: MockAdvancedMarkerElement,
      PinElement: MockPinElement,
    },
    InfoWindow: MockInfoWindow,
    event: {
      clearInstanceListeners: vi.fn(),
    },
    importLibrary: vi.fn().mockResolvedValue({
      AdvancedMarkerElement: MockAdvancedMarkerElement,
      PinElement: MockPinElement,
    }),
    LatLng: MockLatLng,
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
