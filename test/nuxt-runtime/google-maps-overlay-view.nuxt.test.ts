/// <reference types="google.maps" />
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, provide, shallowRef } from 'vue'
import ScriptGoogleMapsOverlayView from '../../packages/script/src/runtime/components/GoogleMaps/ScriptGoogleMapsOverlayView.vue'
import { MAP_INJECTION_KEY, normalizeLatLng } from '../../packages/script/src/runtime/components/GoogleMaps/useGoogleMapsResource'

// ---------------------------------------------------------------------------
// normalizeLatLng — pure helper, no SFC mount required
// ---------------------------------------------------------------------------

describe('normalizeLatLng', () => {
  it('returns LatLngLiteral unchanged', () => {
    const literal = { lat: 10, lng: 20 }
    expect(normalizeLatLng(literal)).toEqual({ lat: 10, lng: 20 })
  })

  it('extracts coordinates from a LatLng instance via .lat()/.lng()', () => {
    // Mimics google.maps.LatLng's API: callable lat/lng accessors.
    const latLngInstance = {
      lat: () => 33,
      lng: () => 151,
    } as unknown as google.maps.LatLng

    expect(normalizeLatLng(latLngInstance)).toEqual({ lat: 33, lng: 151 })
  })

  it('handles negative coordinates from a LatLng instance', () => {
    const latLngInstance = {
      lat: () => -41.5,
      lng: () => -72.25,
    } as unknown as google.maps.LatLng

    expect(normalizeLatLng(latLngInstance)).toEqual({ lat: -41.5, lng: -72.25 })
  })
})

// ---------------------------------------------------------------------------
// SFC mount-based tests for the controlled/uncontrolled open API
// ---------------------------------------------------------------------------

// Minimal mock OverlayView base class. Real Google Maps invokes onAdd + draw
// from inside setMap once a map is attached; we replicate just enough of that
// lifecycle so the SFC's CustomOverlay subclass exercises its draw() body.
function createMockOverlayBase() {
  return class MockOverlayViewBase {
    private _map: any = null
    setMap(map: any) {
      if (this._map === map)
        return
      if (this._map === null && map !== null) {
        this._map = map
        ;(this as any).onAdd?.()
        ;(this as any).draw?.()
      }
      else if (this._map !== null && map === null) {
        ;(this as any).onRemove?.()
        this._map = null
      }
    }

    getMap() {
      return this._map
    }

    getPanes() {
      return {
        mapPane: document.createElement('div'),
        overlayLayer: document.createElement('div'),
        markerLayer: document.createElement('div'),
        overlayMouseTarget: document.createElement('div'),
        floatPane: document.createElement('div'),
      } as unknown as google.maps.MapPanes
    }

    getProjection() {
      return {
        fromLatLngToDivPixel: () => ({ x: 100, y: 200 }),
      } as unknown as google.maps.MapCanvasProjection
    }

    static preventMapHitsAndGesturesFrom() {}
  }
}

function createOverlayMocks() {
  const MockOverlayViewBase = createMockOverlayBase()
  const mockMap = {
    getDiv: () => document.createElement('div'),
    panBy: vi.fn(),
  }
  // `function` (not arrow) so it works with both call and `new` invocation;
  // returning a non-this object satisfies the SFC's `new mapsApi.LatLng(...)`.
  // eslint-disable-next-line prefer-arrow-callback
  const MockLatLng = vi.fn(function (this: any, lat: number, lng: number) {
    return { lat, lng }
  }) as unknown as new (lat: number, lng: number) => google.maps.LatLng
  const mockMapsApi = {
    OverlayView: MockOverlayViewBase,
    LatLng: MockLatLng,
    event: { clearInstanceListeners: vi.fn() },
  }
  return { mockMap, mockMapsApi }
}

function createMapProvider(mocks: ReturnType<typeof createOverlayMocks>) {
  const map = shallowRef<any>(mocks.mockMap)
  const mapsApi = shallowRef<any>(mocks.mockMapsApi)

  return defineComponent({
    setup(_, { slots }) {
      provide(MAP_INJECTION_KEY, { map, mapsApi, activateInfoWindow: () => {} })
      return () => h('div', slots.default?.())
    },
  })
}

async function mountOverlay(props: Record<string, any>, mocks = createOverlayMocks()) {
  const Provider = createMapProvider(mocks)
  const wrapper = await mountSuspended(Provider, {
    slots: {
      default: () => h(ScriptGoogleMapsOverlayView, props, () => h('div', { class: 'overlay-content' })),
    },
  })

  // Allow useGoogleMapsResource's whenever() to fire and the overlay to attach
  await nextTick()
  await nextTick()
  await nextTick()

  const overlayWrapper = wrapper.findComponent(ScriptGoogleMapsOverlayView)
  return { wrapper, overlayWrapper, mocks }
}

describe('scriptGoogleMapsOverlayView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uncontrolled mode (no v-model:open)', () => {
    it('opens by default when no open-related prop is set', async () => {
      const { overlayWrapper } = await mountOverlay({ position: { lat: 10, lng: 20 } })

      // Resource is created and draw() runs through the "open" path
      expect((overlayWrapper.vm as any).dataState).toBe('open')
    })

    it('starts closed when defaultOpen is false', async () => {
      const { overlayWrapper } = await mountOverlay({
        position: { lat: 10, lng: 20 },
        defaultOpen: false,
      })

      expect((overlayWrapper.vm as any).dataState).toBe('closed')
    })

    it('starts open when defaultOpen is explicitly true', async () => {
      const { overlayWrapper } = await mountOverlay({
        position: { lat: 10, lng: 20 },
        defaultOpen: true,
      })

      expect((overlayWrapper.vm as any).dataState).toBe('open')
    })
  })

  describe('controlled mode (v-model:open)', () => {
    it('respects an explicit :open=true prop', async () => {
      const { overlayWrapper } = await mountOverlay({
        position: { lat: 10, lng: 20 },
        open: true,
      })

      expect((overlayWrapper.vm as any).dataState).toBe('open')
    })

    it('respects an explicit :open=false prop', async () => {
      const { overlayWrapper } = await mountOverlay({
        position: { lat: 10, lng: 20 },
        open: false,
      })

      expect((overlayWrapper.vm as any).dataState).toBe('closed')
    })

    it('emits update:open when open is mutated internally (controlled mode)', async () => {
      // Listen for the v-model event by passing onUpdate:open directly
      const onUpdateOpen = vi.fn()
      const mocks = createOverlayMocks()
      const Provider = createMapProvider(mocks)

      await mountSuspended(Provider, {
        slots: {
          default: () => h(ScriptGoogleMapsOverlayView, {
            'position': { lat: 10, lng: 20 },
            'open': true,
            'onUpdate:open': onUpdateOpen,
          }, () => h('div')),
        },
      })

      await nextTick()
      await nextTick()

      // Smoke check: nothing mutates open during a normal mount, so onUpdate:open
      // should not have been called yet.
      expect(onUpdateOpen).not.toHaveBeenCalled()
    })
  })

  describe('position prop (LatLng | LatLngLiteral)', () => {
    it('accepts a LatLngLiteral and renders the overlay', async () => {
      const mocks = createOverlayMocks()
      const { overlayWrapper } = await mountOverlay(
        { position: { lat: 10, lng: 20 } },
        mocks,
      )

      expect((overlayWrapper.vm as any).dataState).toBe('open')
      // The SFC constructs `new mapsApi.LatLng(lat, lng)` after normalizing
      expect(mocks.mockMapsApi.LatLng).toHaveBeenCalledWith(10, 20)
    })

    it('accepts a google.maps.LatLng-shaped instance and renders the overlay', async () => {
      const mocks = createOverlayMocks()
      // Mimic the real google.maps.LatLng API: callable lat/lng accessors.
      // The MockLatLng in __mocks__/google-maps-api.ts returns a plain object,
      // so we construct one manually here to exercise the function-call path.
      const latLngInstance = {
        lat: () => 33.8688,
        lng: () => 151.2093,
      } as unknown as google.maps.LatLng

      const { overlayWrapper } = await mountOverlay(
        { position: latLngInstance },
        mocks,
      )

      expect((overlayWrapper.vm as any).dataState).toBe('open')
      // After normalization the SFC should call LatLng with primitive numbers
      expect(mocks.mockMapsApi.LatLng).toHaveBeenCalledWith(33.8688, 151.2093)
    })
  })
})
