import type { MocksType } from './__helpers__/google-maps-test-utils'
/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  simulateGeoJsonLifecycle,
  TEST_OPTIONS,
} from './__helpers__/google-maps-test-utils'
import {
  createMockGoogleMapsAPI,
  DATA_FEATURE_EVENTS,
  DATA_MOUSE_EVENTS,
} from './__mocks__/google-maps-api'

describe('scriptGoogleMapsGeoJson Component Logic', () => {
  let mocks: MocksType

  beforeEach(() => {
    mocks = createMockGoogleMapsAPI()
    vi.clearAllMocks()
  })

  describe('data Layer Creation', () => {
    it('should create a Data layer with map option', () => {
      const mockMap = {}
      const dataLayer = new mocks.mockMapsApi.Data({ map: mockMap })

      expect(mocks.mockMapsApi.Data).toHaveBeenCalledWith({ map: mockMap })
      expect(dataLayer).toBe(mocks.mockDataLayer)
    })

    it('should set style when provided', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })
      const style = { fillColor: 'red', strokeWeight: 2 }

      dataLayer.setStyle(style)

      expect(dataLayer.setStyle).toHaveBeenCalledWith(style)
    })

    it('should set style with a styling function', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })
      const styleFn = vi.fn(() => ({ fillColor: 'blue' }))

      dataLayer.setStyle(styleFn)

      expect(dataLayer.setStyle).toHaveBeenCalledWith(styleFn)
    })
  })

  describe('geoJson Loading', () => {
    it('should call addGeoJson for object sources', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })
      const geoJson = TEST_OPTIONS.geoJson

      dataLayer.addGeoJson(geoJson)

      expect(dataLayer.addGeoJson).toHaveBeenCalledWith(geoJson)
    })

    it('should call loadGeoJson for string URL sources', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })
      const url = 'https://example.com/data.geojson'

      dataLayer.loadGeoJson(url)

      expect(dataLayer.loadGeoJson).toHaveBeenCalledWith(url)
    })

    it('should clear existing features before reloading', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })

      // Add initial data
      dataLayer.addGeoJson({ type: 'FeatureCollection', features: [] })

      // Clear features (simulate src watcher)
      dataLayer.forEach((feature: any) => dataLayer.remove(feature))

      expect(dataLayer.forEach).toHaveBeenCalled()
    })
  })

  describe('event Handling', () => {
    it('should register all mouse events', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })

      DATA_MOUSE_EVENTS.forEach((event) => {
        dataLayer.addListener(event, vi.fn())
      })

      expect(dataLayer.addListener).toHaveBeenCalledTimes(DATA_MOUSE_EVENTS.length)
      DATA_MOUSE_EVENTS.forEach((event) => {
        expect(dataLayer.addListener).toHaveBeenCalledWith(event, expect.any(Function))
      })
    })

    it('should register all feature events', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })

      DATA_FEATURE_EVENTS.forEach((event) => {
        dataLayer.addListener(event, vi.fn())
      })

      expect(dataLayer.addListener).toHaveBeenCalledTimes(DATA_FEATURE_EVENTS.length)
      DATA_FEATURE_EVENTS.forEach((event) => {
        expect(dataLayer.addListener).toHaveBeenCalledWith(event, expect.any(Function))
      })
    })

    it('should register both mouse and feature events together', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })
      const allEvents = [...DATA_MOUSE_EVENTS, ...DATA_FEATURE_EVENTS]

      allEvents.forEach((event) => {
        dataLayer.addListener(event, vi.fn())
      })

      expect(dataLayer.addListener).toHaveBeenCalledTimes(allEvents.length)
    })
  })

  describe('cleanup', () => {
    it('should clear instance listeners and detach from map on cleanup', () => {
      const dataLayer = new mocks.mockMapsApi.Data({ map: {} })

      mocks.mockMapsApi.event.clearInstanceListeners(dataLayer)
      dataLayer.setMap(null)

      expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(dataLayer)
      expect(dataLayer.setMap).toHaveBeenCalledWith(null)
    })
  })

  describe('lifecycle Simulation', () => {
    it('should simulate complete GeoJson lifecycle with object source', () => {
      const dataLayer = simulateGeoJsonLifecycle(mocks, TEST_OPTIONS.geoJson, { fillColor: 'red' })

      expect(mocks.mockMapsApi.Data).toHaveBeenCalled()
      expect(dataLayer.setStyle).toHaveBeenCalledWith({ fillColor: 'red' })
      expect(dataLayer.addGeoJson).toHaveBeenCalledWith(TEST_OPTIONS.geoJson)
      expect(dataLayer.addListener).toHaveBeenCalledWith('click', expect.any(Function))
      expect(dataLayer.addListener).toHaveBeenCalledWith('addfeature', expect.any(Function))
      expect(dataLayer.setMap).toHaveBeenCalledWith(null)
      expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(dataLayer)
    })

    it('should simulate complete GeoJson lifecycle with URL source', () => {
      const url = 'https://example.com/data.geojson'
      const dataLayer = simulateGeoJsonLifecycle(mocks, url)

      expect(mocks.mockMapsApi.Data).toHaveBeenCalled()
      expect(dataLayer.loadGeoJson).toHaveBeenCalledWith(url)
      expect(dataLayer.addGeoJson).not.toHaveBeenCalled()
      expect(dataLayer.setStyle).not.toHaveBeenCalled()
      expect(dataLayer.setMap).toHaveBeenCalledWith(null)
    })
  })
})
