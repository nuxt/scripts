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
  const canvas = document.createElement('canvas')
  const layerBindings: Array<{
    type: string
    layerIds: string[]
    listener: (event: any) => void
    subscription: { unsubscribe: ReturnType<typeof vi.fn> }
  }> = []
  const source = { type: 'geojson', setData: vi.fn() }
  const layers = new Set<string>()
  const sources = new Set<string>()
  const map: Record<string, any> = {
    on: vi.fn((name: string, layerIdsOrCallback: any, layerCallback?: (event: any) => void) => {
      if (typeof layerIdsOrCallback === 'function') {
        styleEvents.set(name, layerIdsOrCallback)
        return map
      }
      const subscription = { unsubscribe: vi.fn() }
      layerBindings.push({
        type: name,
        layerIds: layerIdsOrCallback,
        listener: layerCallback!,
        subscription,
      })
      return subscription
    }),
    off: vi.fn(() => map),
    getCanvas: vi.fn(() => canvas),
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
  return {
    maplibre,
    map,
    marker,
    markerElement,
    popup,
    control,
    source,
    styleEvents,
    canvas,
    layerBindings,
    /** The most recent binding for an event type. */
    layerBinding(type: string) {
      return layerBindings.filter(binding => binding.type === type).at(-1)!
    },
  }
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

  it('adds GeoJSON resources when the initial map load finishes', async () => {
    const mocks = createMapLibreMock()
    mocks.map.isStyleLoaded.mockReturnValue(false)
    mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'delivery-route',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'delivery-progress', type: 'line' }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    expect(mocks.map.addSource).not.toHaveBeenCalled()
    mocks.map.isStyleLoaded.mockReturnValue(true)
    mocks.styleEvents.get('load')?.()

    expect(mocks.map.addSource).toHaveBeenCalledWith('delivery-route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
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

  it('emits an error when GeoJSON resource creation fails', async () => {
    const mocks = createMapLibreMock()
    const creationFailure = new Error('Invalid paint expression')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.map.addLayer.mockImplementationOnce(() => {
      throw creationFailure
    })

    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'invalid-layer', type: 'fill', paint: { 'fill-color': 'not-a-colour' } }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    expect(wrapper.emitted('error')?.[0]).toEqual([creationFailure])

    // correcting the layer recovers without a remount
    await wrapper.setProps({
      layers: [{ id: 'invalid-layer', type: 'fill', paint: { 'fill-color': '#396cb2' } }],
    })
    expect(mocks.map.addLayer).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('error')).toHaveLength(1)

    error.mockRestore()
    wrapper.unmount()
  })

  it('keeps the GeoJSON source when layers and source options keep their content', async () => {
    const mocks = createMapLibreMock()
    const data = { type: 'FeatureCollection', features: [] } as const
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data,
        sourceOptions: { cluster: true, clusterRadius: 50 },
        layers: [{ id: 'melbourne-circle', type: 'circle', paint: { 'circle-color': '#396cb2' } }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()
    expect(mocks.map.addSource).toHaveBeenCalledTimes(1)

    // an inline array literal in a parent template gets a fresh identity on
    // every re-render, but its content is unchanged
    await wrapper.setProps({
      sourceOptions: { cluster: true, clusterRadius: 50 },
      layers: [{ id: 'melbourne-circle', type: 'circle', paint: { 'circle-color': '#396cb2' } }],
    })

    expect(mocks.map.removeSource).not.toHaveBeenCalled()
    expect(mocks.map.removeLayer).not.toHaveBeenCalled()
    expect(mocks.map.addSource).toHaveBeenCalledTimes(1)

    // a real content change still rebuilds
    await wrapper.setProps({
      layers: [{ id: 'melbourne-circle', type: 'circle', paint: { 'circle-color': '#b23939' } }],
    })
    expect(mocks.map.addSource).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('rebuilds after a skipped sync even when the layers return to the last applied value', async () => {
    const mocks = createMapLibreMock()
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()
    expect(mocks.map.addSource).toHaveBeenCalledTimes(1)

    // a style swap drops every source and layer, and the style is not loaded yet
    mocks.map.isStyleLoaded.mockReturnValue(false)
    await wrapper.setProps({ layers: [{ id: 'melbourne-heat', type: 'heatmap' }] })
    expect(mocks.map.addSource).toHaveBeenCalledTimes(1)

    mocks.map.isStyleLoaded.mockReturnValue(true)
    await wrapper.setProps({ layers: [{ id: 'melbourne-circle', type: 'circle' }] })
    expect(mocks.map.addSource).toHaveBeenCalledTimes(2)
    expect(mocks.map.addLayer).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'melbourne-circle' }), undefined)

    wrapper.unmount()
  })

  it('emits layer events, applies the hover cursor and rebinds after a rebuild', async () => {
    const mocks = createMapLibreMock()
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
        cursor: 'pointer',
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    expect(mocks.layerBinding('click').layerIds).toEqual(['melbourne-circle'])

    const clickEvent = { type: 'click', features: [{ id: 1 }] }
    mocks.layerBinding('click').listener(clickEvent)
    expect(wrapper.emitted('click')?.[0]).toEqual([clickEvent])

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('pointer')
    expect(wrapper.emitted('mouseenter')).toHaveLength(1)

    mocks.layerBinding('mouseleave').listener({ type: 'mouseleave' })
    expect(mocks.canvas.style.cursor).toBe('')
    expect(wrapper.emitted('mouseleave')).toHaveLength(1)

    const staleClick = mocks.layerBinding('click')
    await wrapper.setProps({ layers: [{ id: 'melbourne-heat', type: 'heatmap' }] })
    expect(staleClick.subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(mocks.layerBinding('click').layerIds).toEqual(['melbourne-heat'])

    const liveClick = mocks.layerBinding('click')
    wrapper.unmount()
    expect(liveClick.subscription.unsubscribe).toHaveBeenCalledOnce()
  })

  it('tracks the cursor prop while the pointer stays over a layer', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
        cursor: 'pointer',
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('pointer')

    // changing the prop applies without a mouseleave
    await wrapper.setProps({ cursor: 'crosshair' })
    expect(mocks.canvas.style.cursor).toBe('crosshair')

    // clearing the prop restores the canvas default
    await wrapper.setProps({ cursor: undefined })
    expect(mocks.canvas.style.cursor).toBe('grab')

    // setting it again while still hovering applies it
    await wrapper.setProps({ cursor: 'zoom-in' })
    expect(mocks.canvas.style.cursor).toBe('zoom-in')

    mocks.layerBinding('mouseleave').listener({ type: 'mouseleave' })
    expect(mocks.canvas.style.cursor).toBe('grab')
    wrapper.unmount()
  })

  it('applies a cursor added after the pointer entered a layer', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('grab')

    await wrapper.setProps({ cursor: 'pointer' })
    expect(mocks.canvas.style.cursor).toBe('pointer')

    mocks.layerBinding('mouseleave').listener({ type: 'mouseleave' })
    expect(mocks.canvas.style.cursor).toBe('grab')
    wrapper.unmount()
  })

  it('keeps the hover cursor when a style reload rebuilds the same layers', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
        cursor: 'pointer',
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('pointer')

    // a style reload re-adds the same layers, and MapLibre does not fire
    // mouseenter again while the pointer stays still
    mocks.styleEvents.get('style.load')?.()
    await nextTick()
    expect(mocks.canvas.style.cursor).toBe('pointer')

    mocks.layerBinding('mouseleave').listener({ type: 'mouseleave' })
    expect(mocks.canvas.style.cursor).toBe('grab')
    wrapper.unmount()
  })

  it('drops the hover cursor when a prop change rebuilds the same layer IDs', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle', filter: ['has', 'point_count'] }],
        cursor: 'pointer',
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('pointer')

    // the layer ID is unchanged but the filter is not, so the pointer may no
    // longer sit over a rendered feature
    await wrapper.setProps({
      layers: [{ id: 'melbourne-circle', type: 'circle', filter: ['!', ['has', 'point_count']] }],
    })
    expect(mocks.canvas.style.cursor).toBe('grab')
    // the component never invents a pointer event it did not receive
    expect(wrapper.emitted('mouseleave')).toBeUndefined()

    // MapLibre re-evaluates on the next pointer move, whether the pointer is
    // still over a feature or over a spot the new filter emptied
    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('pointer')

    mocks.layerBinding('mouseleave').listener({ type: 'mouseleave' })
    expect(mocks.canvas.style.cursor).toBe('grab')
    wrapper.unmount()
  })

  it('drops the hover cursor when a rebuild replaces the layers', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
        cursor: 'pointer',
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('pointer')

    // different layers may not sit under the pointer, so the cursor resets
    await wrapper.setProps({ layers: [{ id: 'melbourne-heat', type: 'heatmap' }] })
    expect(mocks.canvas.style.cursor).toBe('grab')
    wrapper.unmount()
  })

  it('leaves the cursor alone while the pointer is away from every layer', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    await wrapper.setProps({ cursor: 'pointer' })
    expect(mocks.canvas.style.cursor).toBe('grab')
    wrapper.unmount()
  })

  it('leaves the cursor alone without a cursor prop', async () => {
    const mocks = createMapLibreMock()
    mocks.canvas.style.cursor = 'grab'
    const wrapper = mount(ScriptMapLibreGeoJson, {
      props: {
        sourceId: 'melbourne',
        data: { type: 'FeatureCollection', features: [] },
        layers: [{ id: 'melbourne-circle', type: 'circle' }],
      },
      global: provideMap(mocks.maplibre, mocks.map),
    })
    await nextTick()

    mocks.layerBinding('mouseenter').listener({ type: 'mouseenter' })
    expect(mocks.canvas.style.cursor).toBe('grab')

    mocks.layerBinding('mouseleave').listener({ type: 'mouseleave' })
    expect(mocks.canvas.style.cursor).toBe('grab')
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
