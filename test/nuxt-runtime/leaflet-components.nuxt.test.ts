import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, shallowRef } from 'vue'
import ScriptLeafletGeoJson from '../../packages/script/src/runtime/components/Leaflet/ScriptLeafletGeoJson.vue'
import ScriptLeafletMarker from '../../packages/script/src/runtime/components/Leaflet/ScriptLeafletMarker.vue'
import ScriptLeafletPopup from '../../packages/script/src/runtime/components/Leaflet/ScriptLeafletPopup.vue'
import ScriptLeafletTileLayer from '../../packages/script/src/runtime/components/Leaflet/ScriptLeafletTileLayer.vue'
import { LEAFLET_MAP_INJECTION_KEY } from '../../packages/script/src/runtime/components/Leaflet/useLeafletResource'

function evented(overrides: Record<string, any> = {}) {
  const target: Record<string, any> = {
    on: vi.fn(() => target),
    off: vi.fn(() => target),
    remove: vi.fn(() => target),
    addTo: vi.fn(() => target),
    ...overrides,
  }
  return target
}

function createLeafletMock() {
  const tileLayer = evented({ setUrl: vi.fn(), setOpacity: vi.fn(), setZIndex: vi.fn(), redraw: vi.fn() })
  const marker = evented({
    bindPopup: vi.fn(),
    unbindPopup: vi.fn(),
    openPopup: vi.fn(),
    closePopup: vi.fn(),
    setLatLng: vi.fn(),
    setIcon: vi.fn(),
    setOpacity: vi.fn(),
    setZIndexOffset: vi.fn(),
    getElement: vi.fn(),
  })
  const popup = evented({
    setContent: vi.fn(() => popup),
    setLatLng: vi.fn(() => popup),
    openOn: vi.fn(() => popup),
    close: vi.fn(() => popup),
    update: vi.fn(),
    options: {},
  })
  const geoJson = evented({ clearLayers: vi.fn(), addData: vi.fn(), setStyle: vi.fn() })
  const leaflet = {
    tileLayer: vi.fn(() => tileLayer),
    marker: vi.fn(() => marker),
    popup: vi.fn(() => popup),
    geoJSON: vi.fn(() => geoJson),
    Util: { setOptions: vi.fn() },
  }
  return { leaflet, tileLayer, marker, popup, geoJson }
}

function provideMap(leaflet: any) {
  return {
    provide: {
      [LEAFLET_MAP_INJECTION_KEY as symbol]: {
        map: shallowRef({ id: 'map' } as any),
        leaflet: shallowRef(leaflet),
      },
    },
  }
}

describe('leaflet components', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates, updates, and removes a tile layer', async () => {
    const mocks = createLeafletMock()
    const wrapper = mount(ScriptLeafletTileLayer, {
      props: {
        url: 'https://tiles.example/{z}/{x}/{y}.png',
        options: { attribution: 'Example' },
      },
      global: provideMap(mocks.leaflet),
    })
    await nextTick()

    expect(mocks.leaflet.tileLayer).toHaveBeenCalledWith(
      'https://tiles.example/{z}/{x}/{y}.png',
      { attribution: 'Example' },
    )
    expect(mocks.tileLayer.addTo).toHaveBeenCalled()

    await wrapper.setProps({ url: 'https://new.example/{z}/{x}/{y}.png' })
    expect(mocks.tileLayer.setUrl).toHaveBeenCalledWith('https://new.example/{z}/{x}/{y}.png')

    wrapper.unmount()
    expect(mocks.tileLayer.remove).toHaveBeenCalledOnce()
  })

  it('composes a popup inside an accessible marker', async () => {
    const mocks = createLeafletMock()
    const wrapper = mount(ScriptLeafletMarker, {
      props: {
        position: [-37.8136, 144.9631],
        alt: 'Melbourne office',
      },
      slots: {
        default: () => h(ScriptLeafletPopup, { open: true }, () => 'Hello Melbourne'),
      },
      global: provideMap(mocks.leaflet),
    })
    await nextTick()
    await nextTick()

    expect(mocks.leaflet.marker).toHaveBeenCalledWith([-37.8136, 144.9631], expect.objectContaining({ alt: 'Melbourne office' }))
    expect(mocks.marker.bindPopup).toHaveBeenCalledWith(mocks.popup)
    expect(mocks.marker.openPopup).toHaveBeenCalled()

    wrapper.unmount()
    expect(mocks.marker.unbindPopup).toHaveBeenCalled()
    expect(mocks.marker.remove).toHaveBeenCalled()
  })

  it('replaces GeoJSON data without recreating the layer', async () => {
    const mocks = createLeafletMock()
    const initial = { type: 'FeatureCollection', features: [] } as const
    const wrapper = mount(ScriptLeafletGeoJson, {
      props: { data: initial },
      global: provideMap(mocks.leaflet),
    })
    await nextTick()

    const next = { type: 'Point', coordinates: [144.9631, -37.8136] } as const
    await wrapper.setProps({ data: next })

    expect(mocks.geoJson.clearLayers).toHaveBeenCalledOnce()
    expect(mocks.geoJson.addData).toHaveBeenCalledWith(next)
    expect(mocks.leaflet.geoJSON).toHaveBeenCalledOnce()
  })
})
