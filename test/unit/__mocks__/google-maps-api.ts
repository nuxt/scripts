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

export function createMockDataLayer() {
  const features: any[] = []
  return {
    setStyle: vi.fn(),
    setMap: vi.fn(),
    addGeoJson: vi.fn((geoJson: any) => {
      features.push(geoJson)
      return features
    }),
    loadGeoJson: vi.fn(),
    forEach: vi.fn((callback: (feature: any) => void) => {
      features.forEach(callback)
    }),
    remove: vi.fn((feature: any) => {
      const idx = features.indexOf(feature)
      if (idx >= 0)
        features.splice(idx, 1)
    }),
    addListener: vi.fn(),
    _features: features,
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

// Class-based mocks that return a fresh instance per call (for multi-instance tests)
function createMockClassFactory<T>(factory: () => T) {
  const instances: T[] = []
  // eslint-disable-next-line prefer-arrow-callback
  const MockClass = vi.fn(function () {
    const instance = factory()
    instances.push(instance)
    return instance
  }) as unknown as (new (...args: any[]) => T) & ReturnType<typeof vi.fn> & { instances: T[] }
  MockClass.instances = instances
  return MockClass
}

export function createMockGoogleMapsAPI() {
  const mockMarker = createMockMarker()
  const mockAdvancedMarkerElement = createMockAdvancedMarkerElement()
  const mockInfoWindow = createMockInfoWindow()
  const mockPinElement = createMockPinElement()
  const mockMarkerClusterer = createMockMarkerClusterer()
  const mockDataLayer = createMockDataLayer()

  const MockMarker = createMockClass(mockMarker)
  const MockAdvancedMarkerElement = createMockClass(mockAdvancedMarkerElement)
  const MockPinElement = createMockClass(mockPinElement)
  const MockInfoWindow = createMockClass(mockInfoWindow)
  const MockData = createMockClass(mockDataLayer)
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
    Data: MockData,
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
    mockDataLayer,
    mockMapsApi,
  }
}

/**
 * Creates a mock Google Maps API where each constructor returns a unique instance.
 * Use this for tests that mount multiple components of the same type.
 */
export function createMockGoogleMapsAPIWithInstances() {
  const MockMarker = createMockClassFactory(createMockMarker)
  const MockAdvancedMarkerElement = createMockClassFactory(createMockAdvancedMarkerElement)
  const MockPinElement = createMockClassFactory(createMockPinElement)
  const MockInfoWindow = createMockClassFactory(createMockInfoWindow)
  const MockCircle = createMockClassFactory(() => ({ setOptions: vi.fn(), setMap: vi.fn(), addListener: vi.fn() }))
  const MockPolygon = createMockClassFactory(() => ({ setOptions: vi.fn(), setMap: vi.fn(), addListener: vi.fn() }))
  const MockPolyline = createMockClassFactory(() => ({ setOptions: vi.fn(), setMap: vi.fn(), addListener: vi.fn() }))
  const MockRectangle = createMockClassFactory(() => ({ setOptions: vi.fn(), setMap: vi.fn(), addListener: vi.fn() }))
  const MockHeatmapLayer = createMockClassFactory(() => ({ setOptions: vi.fn(), setMap: vi.fn() }))
  const MockData = createMockClassFactory(createMockDataLayer)

  const mockMapsApi = {
    Marker: MockMarker,
    marker: {
      AdvancedMarkerElement: MockAdvancedMarkerElement,
      PinElement: MockPinElement,
    },
    InfoWindow: MockInfoWindow,
    Data: MockData,
    Circle: MockCircle,
    Polygon: MockPolygon,
    Polyline: MockPolyline,
    Rectangle: MockRectangle,
    visualization: {
      HeatmapLayer: MockHeatmapLayer,
    },
    event: {
      clearInstanceListeners: vi.fn(),
    },
    importLibrary: vi.fn().mockImplementation((key: string) => {
      if (key === 'marker') {
        return Promise.resolve({
          AdvancedMarkerElement: MockAdvancedMarkerElement,
          PinElement: MockPinElement,
        })
      }
      if (key === 'visualization') {
        return Promise.resolve({
          HeatmapLayer: MockHeatmapLayer,
        })
      }
      return Promise.resolve({})
    }),
    LatLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
  }

  return {
    mockMapsApi,
    MockMarker,
    MockAdvancedMarkerElement,
    MockPinElement,
    MockInfoWindow,
    MockCircle,
    MockPolygon,
    MockPolyline,
    MockRectangle,
    MockHeatmapLayer,
    MockData,
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

export const DATA_MOUSE_EVENTS = [
  'click',
  'contextmenu',
  'dblclick',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
] as const

export const DATA_FEATURE_EVENTS = [
  'addfeature',
  'removefeature',
  'setgeometry',
  'setproperty',
  'removeproperty',
] as const
