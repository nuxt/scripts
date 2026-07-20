import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, shallowRef } from 'vue'
import ScriptMapLibreGeoJson from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreGeoJson.vue'
import ScriptMapLibreMarker from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreMarker.vue'
import ScriptMapLibreNavigationControl from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreNavigationControl.vue'
import ScriptMapLibrePopup from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibrePopup.vue'
import { MAPLIBRE_MAP_INJECTION_KEY } from '../../packages/script/src/runtime/components/MapLibre/useMapLibreResource'

function evented(overrides: Record<string, any> = {}) {
  const events = new Map<string, (event: any) => void>()
  const target: Record<string, any> = {
    on: vi.fn((name: string, callback: (event: any) => void) => {
      events.set(name, callback)
      return target
    }),
    off: vi.fn(() => target),
    ...overrides,
  }
  return { target, events }
}

function createMapLibreMock() {
  const markerElement = document.createElement('div')
  markerElement.setAttribute('aria-label', 'Marker')
  markerElement.setAttribute('role', 'button')
  const markerEvented = evented()
  const marker = Object.assign(markerEvented.target, {
    setLngLat: vi.fn(() => marker),
    addTo: vi.fn(() => marker),
    remove: vi.fn(() => marker),
    getElement: vi.fn(() => markerElement),
    setPopup: vi.fn(() => marker),
    togglePopup: vi.fn(() => marker),
    setDraggable: vi.fn(() => marker),
    setRotation: vi.fn(() => marker),
    setRotationAlignment: vi.fn(() => marker),
    setPitchAlignment: vi.fn(() => marker),
    setOffset: vi.fn(() => marker),
    setOpacity: vi.fn(() => marker),
    setSubpixelPositioning: vi.fn(() => marker),
    addClassName: vi.fn(),
    removeClassName: vi.fn(),
  })

  const popupEvented = evented()
  const popup = Object.assign(popupEvented.target, {
    options: {},
    setDOMContent: vi.fn(() => popup),
    setLngLat: vi.fn(() => popup),
    addTo: vi.fn(() => popup),
    isOpen: vi.fn(() => false),
    remove: vi.fn(() => popup),
    setMaxWidth: vi.fn(() => popup),
    setOffset: vi.fn(() => popup),
    setPadding: vi.fn(),
    setSubpixelPositioning: vi.fn(),
    addClassName: vi.fn(() => popup),
    removeClassName: vi.fn(() => popup),
  })

  const control = { id: 'navigation' }
  const styleEvents = new Map<string, () => void>()
  const source = { type: 'geojson', setData: vi.fn() }
  const layers = new Set<string>()
  const sources = new Set<string>()
  const map: Record<string, any> = {
    on: vi.fn((name: string, callback: () => void) => {
      styleEvents.set(name, callback)
      return map
    }),
    off: vi.fn(() => map),
    isStyleLoaded: vi.fn(() => true),
    addSource: vi.fn((id: string) => {
      sources.add(id)
      return map
    }),
    getSource: vi.fn((id: string) => sources.has(id) ? source : undefined),
    removeSource: vi.fn((id: string) => {
      sources.delete(id)
      return map
    }),
    addLayer: vi.fn((layer: { id: string }) => {
      layers.add(layer.id)
      return map
    }),
    getLayer: vi.fn((id: string) => layers.has(id) ? { id } : undefined),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id)
      return map
    }),
    addControl: vi.fn(() => map),
    hasControl: vi.fn(() => true),
    removeControl: vi.fn(() => map),
  }

  function MarkerConstructor() {
    return marker
  }

  function PopupConstructor() {
    return popup
  }

  function NavigationControlConstructor() {
    return control
  }

  const maplibre = {
    Marker: vi.fn(MarkerConstructor),
    Popup: vi.fn(PopupConstructor),
    NavigationControl: vi.fn(NavigationControlConstructor),
  }
  return { maplibre, map, marker, markerElement, popup, control, source, styleEvents }
}

function provideMap(maplibre: any, map: any) {
  return {
    provide: {
      [MAPLIBRE_MAP_INJECTION_KEY as symbol]: {
        map: shallowRef(map),
        maplibre: shallowRef(maplibre),
      },
    },
  }
}

describe('mapLibre components', () => {
  beforeEach(() => vi.clearAllMocks())

  it('composes an accessible marker and popup', async () => {
    const mocks = createMapLibreMock()
    const wrapper = mount(ScriptMapLibreMarker, {
      props: {
        position: [144.9631, -37.8136],
        ariaLabel: 'Melbourne CBD',
      },
      slots: {
        default: () => h(ScriptMapLibrePopup, { open: true }, () => 'Hello Melbourne'),
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()
    await nextTick()

    expect(mocks.maplibre.Marker).toHaveBeenCalledOnce()
    expect(mocks.marker.setLngLat).toHaveBeenCalledWith([144.9631, -37.8136])
    expect(mocks.markerElement.getAttribute('aria-label')).toBe('Melbourne CBD')
    expect(mocks.markerElement.getAttribute('role')).toBe('button')
    expect(mocks.marker.setPopup).toHaveBeenCalledWith(mocks.popup)
    expect(mocks.marker.togglePopup).toHaveBeenCalledOnce()

    await wrapper.setProps({ ariaLabel: undefined })
    expect(mocks.markerElement.getAttribute('aria-label')).toBe('Marker')

    wrapper.unmount()
    expect(mocks.marker.setPopup).toHaveBeenCalledWith(null)
    expect(mocks.marker.remove).toHaveBeenCalledOnce()
  })

  it('applies supported marker and popup options without resetting omitted state', async () => {
    const mocks = createMapLibreMock()
    const markerWrapper = mount(ScriptMapLibreMarker, {
      props: {
        position: [144.9631, -37.8136],
        ariaLabel: 'Melbourne CBD',
        options: { className: 'initial' },
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    await markerWrapper.setProps({
      options: {
        className: 'updated selected',
        opacityWhenCovered: 0.4,
        rotation: 20,
      },
    })

    expect(mocks.marker.setRotation).toHaveBeenCalledWith(20)
    expect(mocks.marker.setOpacity).toHaveBeenCalledWith(undefined, 0.4)
    expect(mocks.marker.setDraggable).not.toHaveBeenCalled()
    expect(mocks.marker.setRotationAlignment).not.toHaveBeenCalled()
    expect(mocks.marker.setPitchAlignment).not.toHaveBeenCalled()
    expect(mocks.marker.removeClassName).toHaveBeenCalledWith('initial')
    expect(mocks.marker.addClassName).toHaveBeenCalledWith('updated')
    expect(mocks.marker.addClassName).toHaveBeenCalledWith('selected')

    const popupWrapper = mount(ScriptMapLibrePopup, {
      props: {
        position: [144.9631, -37.8136],
        options: { className: 'initial' },
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()
    await nextTick()

    await popupWrapper.setProps({
      options: {
        className: 'updated',
        maxWidth: '320px',
        offset: 12,
        padding: 8,
        subpixelPositioning: true,
      },
    })

    expect(mocks.popup.setMaxWidth).toHaveBeenCalledWith('320px')
    expect(mocks.popup.setOffset).toHaveBeenCalledWith(12)
    expect(mocks.popup.setPadding).toHaveBeenCalledWith(8)
    expect(mocks.popup.setSubpixelPositioning).toHaveBeenCalledWith(true)
    expect(mocks.popup.removeClassName).toHaveBeenCalledWith('initial')
    expect(mocks.popup.addClassName).toHaveBeenCalledWith('updated')

    popupWrapper.unmount()
    markerWrapper.unmount()
  })

  it('adds reactive GeoJSON source data and style layers', async () => {
    const mocks = createMapLibreMock()
    const initial = { type: 'FeatureCollection', features: [] } as const
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: initial,
        layers: [{ id: 'melbourne-fill', type: 'fill', paint: { 'fill-color': '#396cb2' } }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    expect(mocks.map.addSource).toHaveBeenCalledWith('melbourne', {
      type: 'geojson',
      data: initial,
    })
    expect(mocks.map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'melbourne-fill',
      source: 'melbourne',
    }), undefined)

    const next = { type: 'Point', coordinates: [144.9631, -37.8136] } as const
    await wrapper.setProps({ data: next })
    expect(mocks.source.setData).toHaveBeenCalledWith(next)

    mocks.styleEvents.get('style.load')?.()
    expect(mocks.map.addSource).toHaveBeenCalledTimes(2)

    await wrapper.setProps({ sourceId: 'greater-melbourne' })
    expect(mocks.map.removeSource).toHaveBeenCalledWith('melbourne')
    expect(mocks.map.addSource).toHaveBeenLastCalledWith('greater-melbourne', {
      type: 'geojson',
      data: next,
    })

    wrapper.unmount()
    expect(mocks.map.removeLayer).toHaveBeenCalledWith('melbourne-fill')
    expect(mocks.map.removeSource).toHaveBeenLastCalledWith('greater-melbourne')
  })

  it('rolls back a partially created GeoJSON resource', async () => {
    const mocks = createMapLibreMock()
    const creationFailure = new Error('Invalid style layer')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.map.addLayer.mockImplementationOnce(() => {
      throw creationFailure
    })

    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'invalid-layer', type: 'fill' }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    expect(mocks.map.removeSource).toHaveBeenCalledWith('melbourne')
    expect(error).toHaveBeenCalledWith('[nuxt-scripts] MapLibre resource creation failed:', creationFailure)
    wrapper.unmount()
  })

  it('adds and removes a navigation control', async () => {
    const mocks = createMapLibreMock()
    const wrapper = mount(ScriptMapLibreNavigationControl, {
      props: { position: 'top-right' },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    expect(mocks.map.addControl).toHaveBeenCalledWith(mocks.control, 'top-right')
    wrapper.unmount()
    expect(mocks.map.removeControl).toHaveBeenCalledWith(mocks.control)
  })
})
