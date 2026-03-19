import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, provide, ref, shallowRef } from 'vue'
import { MAP_INJECTION_KEY } from '../../src/runtime/components/GoogleMaps/injectionKeys'
import ScriptGoogleMapsAdvancedMarkerElement from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsAdvancedMarkerElement.vue'
import ScriptGoogleMapsCircle from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsCircle.vue'
import ScriptGoogleMapsHeatmapLayer from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsHeatmapLayer.vue'
import ScriptGoogleMapsMarker from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsMarker.vue'
import ScriptGoogleMapsPinElement from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsPinElement.vue'
import ScriptGoogleMapsPolygon from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsPolygon.vue'
import ScriptGoogleMapsPolyline from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsPolyline.vue'
import ScriptGoogleMapsRectangle from '../../src/runtime/components/GoogleMaps/ScriptGoogleMapsRectangle.vue'
import { createMockGoogleMapsAPIWithInstances } from '../unit/__mocks__/google-maps-api'

type MockAPI = ReturnType<typeof createMockGoogleMapsAPIWithInstances>

function createMapProvider(mocks: MockAPI, opts?: { immediate?: boolean }) {
  const map = shallowRef<any>(opts?.immediate !== false ? {} : undefined)
  const mapsApi = ref<any>(opts?.immediate !== false ? mocks.mockMapsApi : undefined)

  return {
    Provider: defineComponent({
      setup(_, { slots }) {
        provide(MAP_INJECTION_KEY, { map, mapsApi } as any)
        return () => h('div', slots.default?.())
      },
    }),
    map,
    mapsApi,
  }
}

async function flushAsync(ticks = 4) {
  for (let i = 0; i < ticks; i++) {
    await nextTick()
  }
}

describe('scri ptGoogleMapsAdvancedMarkerElement', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create an advanced marker and set map', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsAdvancedMarkerElement, {
          options: { position: { lat: 10, lng: 20 } },
        }),
      },
    })

    await flushAsync()

    expect(mocks.mockMapsApi.importLibrary).toHaveBeenCalledWith('marker')
    expect(mocks.MockAdvancedMarkerElement).toHaveBeenCalledWith({ position: { lat: 10, lng: 20 } })

    const marker = mocks.MockAdvancedMarkerElement.instances[0]!
    expect(marker.map).toBeTruthy()
    expect(marker.addListener).toHaveBeenCalled()

    wrapper.unmount()

    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(marker)
    expect(marker.map).toBeNull()
  })

  it('should render slot only when marker is ready', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsAdvancedMarkerElement, {
          options: { position: { lat: 0, lng: 0 } },
        }, { default: () => h('span', { class: 'marker-content' }, 'visible') }),
      },
    })

    await flushAsync()

    expect(wrapper.find('.marker-content').exists()).toBe(true)
    expect(wrapper.find('.marker-content').text()).toBe('visible')

    wrapper.unmount()
  })

  it('should cleanup multiple markers independently on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => [
          h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 1, lng: 1 } } }),
          h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 2, lng: 2 } } }),
          h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 3, lng: 3 } } }),
        ],
      },
    })

    await flushAsync()

    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(3)

    wrapper.unmount()

    // All 3 markers should be cleaned up
    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledTimes(3)
    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }
  })
})

describe('scriptGoogleMapsMarker', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create a marker, set map, and cleanup on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsMarker, {
          options: { position: { lat: 5, lng: 15 }, title: 'Test' },
        }),
      },
    })

    await flushAsync()

    expect(mocks.MockMarker).toHaveBeenCalledWith({ position: { lat: 5, lng: 15 }, title: 'Test' })
    const marker = mocks.MockMarker.instances[0]!
    expect(marker.setMap).toHaveBeenCalledWith(expect.anything()) // set to map
    expect(marker.addListener).toHaveBeenCalled()

    wrapper.unmount()

    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(marker)
    expect(marker.setMap).toHaveBeenLastCalledWith(null)
  })
})

describe('scriptGoogleMapsPinElement', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create pin and attach to parent advanced marker', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsAdvancedMarkerElement, {
          options: { position: { lat: 0, lng: 0 } },
        }, {
          default: () => h(ScriptGoogleMapsPinElement, {
            options: { scale: 1.5, background: '#FF0000' },
          }),
        }),
      },
    })

    await flushAsync()

    expect(mocks.MockPinElement).toHaveBeenCalledWith({ scale: 1.5, background: '#FF0000' })

    const advancedMarker = mocks.MockAdvancedMarkerElement.instances[0]!
    const pin = mocks.MockPinElement.instances[0]!
    expect(advancedMarker.content).toBe(pin.element)

    wrapper.unmount()

    // Pin cleanup should null parent marker content
    expect(advancedMarker.content).toBeNull()
  })
})

describe('scriptGoogleMapsCircle', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create circle with map and cleanup on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsCircle, {
          options: { center: { lat: 0, lng: 0 }, radius: 500 },
        }),
      },
    })

    await flushAsync()

    expect(mocks.MockCircle).toHaveBeenCalledWith(
      expect.objectContaining({ center: { lat: 0, lng: 0 }, radius: 500 }),
    )
    const circle = mocks.MockCircle.instances[0]!
    expect(circle.addListener).toHaveBeenCalled()

    wrapper.unmount()

    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(circle)
    expect(circle.setMap).toHaveBeenCalledWith(null)
  })
})

describe('scriptGoogleMapsPolygon', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create polygon and cleanup on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider
    const paths = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 1, lng: 0 }]

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsPolygon, { options: { paths } }),
      },
    })

    await flushAsync()

    expect(mocks.MockPolygon).toHaveBeenCalledWith(expect.objectContaining({ paths }))
    const polygon = mocks.MockPolygon.instances[0]!

    wrapper.unmount()

    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(polygon)
    expect(polygon.setMap).toHaveBeenCalledWith(null)
  })
})

describe('scriptGoogleMapsPolyline', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create polyline and cleanup on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider
    const path = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsPolyline, { options: { path } }),
      },
    })

    await flushAsync()

    expect(mocks.MockPolyline).toHaveBeenCalledWith(expect.objectContaining({ path }))
    const polyline = mocks.MockPolyline.instances[0]!

    wrapper.unmount()

    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(polyline)
    expect(polyline.setMap).toHaveBeenCalledWith(null)
  })
})

describe('scriptGoogleMapsRectangle', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create rectangle and cleanup on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider
    const bounds = { north: 1, south: 0, east: 1, west: 0 }

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsRectangle, { options: { bounds } }),
      },
    })

    await flushAsync()

    expect(mocks.MockRectangle).toHaveBeenCalledWith(expect.objectContaining({ bounds }))
    const rectangle = mocks.MockRectangle.instances[0]!

    wrapper.unmount()

    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(rectangle)
    expect(rectangle.setMap).toHaveBeenCalledWith(null)
  })
})

describe('scriptGoogleMapsHeatmapLayer', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should create heatmap layer and cleanup on unmount', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsHeatmapLayer, {
          options: { radius: 20 },
        }),
      },
    })

    await flushAsync()

    expect(mocks.mockMapsApi.importLibrary).toHaveBeenCalledWith('visualization')
    expect(mocks.MockHeatmapLayer).toHaveBeenCalledWith(
      expect.objectContaining({ radius: 20 }),
    )
    const layer = mocks.MockHeatmapLayer.instances[0]!

    wrapper.unmount()

    expect(layer.setMap).toHaveBeenCalledWith(null)
  })
})

describe('memory leak prevention - mount/unmount cycles', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should properly cleanup all markers across multiple mount/unmount cycles', async () => {
    const Provider = createMapProvider(mocks).Provider

    for (let cycle = 0; cycle < 3; cycle++) {
      const wrapper = await mountSuspended(Provider, {
        slots: {
          default: () => [
            h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 1, lng: 1 } } }),
            h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 2, lng: 2 } } }),
          ],
        },
      })

      await flushAsync()
      wrapper.unmount()
    }

    // 3 cycles × 2 markers = 6 markers created
    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(6)

    // All 6 should have been cleaned up (map set to null)
    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }

    // clearInstanceListeners should have been called for each
    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledTimes(6)
  })

  it('should cleanup nested component trees (marker + pin)', async () => {
    const Provider = createMapProvider(mocks).Provider

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsAdvancedMarkerElement, {
          options: { position: { lat: 0, lng: 0 } },
        }, {
          default: () => h(ScriptGoogleMapsPinElement, {
            options: { scale: 2 },
          }),
        }),
      },
    })

    await flushAsync()

    const marker = mocks.MockAdvancedMarkerElement.instances[0]!
    const pin = mocks.MockPinElement.instances[0]!
    expect(marker.content).toBe(pin.element)

    wrapper.unmount()

    // Both should be cleaned up
    expect(marker.map).toBeNull()
    expect(marker.content).toBeNull()
    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledWith(marker)
  })
})

describe('memory leak prevention - v-for reactive list (issue #646 scenario)', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should cleanup all markers when v-for list changes', async () => {
    // This is the exact pattern from the bug report:
    // <ScriptGoogleMapsAdvancedMarkerElement v-for="location in locations" :key="location.id" />
    const locations = ref([
      { id: 1, lat: 1, lng: 1 },
      { id: 2, lat: 2, lng: 2 },
      { id: 3, lat: 3, lng: 3 },
    ])

    const Provider = createMapProvider(mocks).Provider

    const MarkerList = defineComponent({
      setup() {
        return { locations }
      },
      render() {
        return locations.value.map(loc =>
          h(ScriptGoogleMapsAdvancedMarkerElement, {
            key: loc.id,
            options: { position: { lat: loc.lat, lng: loc.lng } },
          }),
        )
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(MarkerList) },
    })

    await flushAsync()

    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(3)

    // Change the list — removes all old markers, creates new ones
    locations.value = [
      { id: 4, lat: 4, lng: 4 },
      { id: 5, lat: 5, lng: 5 },
    ]

    await flushAsync()

    // Old markers (0-2) should be cleaned up, new ones (3-4) created
    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(5)

    // First 3 markers should have been cleaned up
    for (let i = 0; i < 3; i++) {
      expect(mocks.MockAdvancedMarkerElement.instances[i]!.map).toBeNull()
    }

    // New markers should be assigned to map
    for (let i = 3; i < 5; i++) {
      expect(mocks.MockAdvancedMarkerElement.instances[i]!.map).toBeTruthy()
    }

    wrapper.unmount()

    // All should be cleaned up after unmount
    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }
  })

  it('should cleanup markers when v-for list is emptied', async () => {
    const locations = ref([
      { id: 1, lat: 1, lng: 1 },
      { id: 2, lat: 2, lng: 2 },
    ])

    const Provider = createMapProvider(mocks).Provider

    const MarkerList = defineComponent({
      setup() {
        return { locations }
      },
      render() {
        return locations.value.map(loc =>
          h(ScriptGoogleMapsAdvancedMarkerElement, {
            key: loc.id,
            options: { position: { lat: loc.lat, lng: loc.lng } },
          }),
        )
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(MarkerList) },
    })

    await flushAsync()
    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(2)

    // Empty the list — simulates navigating away from locations
    locations.value = []
    await flushAsync()

    // Both markers should be cleaned up
    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }
    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })
})

describe('memory leak prevention - deferred map readiness', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should not create marker if unmounted before map becomes ready', async () => {
    const { Provider, map, mapsApi } = createMapProvider(mocks, { immediate: false })

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(ScriptGoogleMapsAdvancedMarkerElement, {
          options: { position: { lat: 0, lng: 0 } },
        }),
      },
    })

    await flushAsync()

    // Map not ready yet — no marker created
    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(0)

    // Unmount before map becomes ready
    wrapper.unmount()

    // Now make map ready — should NOT trigger marker creation
    map.value = {}
    mapsApi.value = mocks.mockMapsApi
    await flushAsync()

    // No marker should have been created
    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(0)
  })
})

describe('memory leak prevention - options reactivity after unmount', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should not apply options changes after unmount (watcher stopped)', async () => {
    const Provider = createMapProvider(mocks).Provider
    const optionsRef = ref<any>({ position: { lat: 0, lng: 0 } })

    const Child = defineComponent({
      props: ['options'],
      setup(props) {
        return () => h(ScriptGoogleMapsAdvancedMarkerElement, {
          options: props.options,
        })
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => h(Child, { options: optionsRef.value }),
      },
    })

    await flushAsync()

    const marker = mocks.MockAdvancedMarkerElement.instances[0]!
    const positionBeforeUnmount = marker.position

    wrapper.unmount()

    // Try changing options after unmount
    optionsRef.value = { position: { lat: 99, lng: 99 } }
    await flushAsync()

    // Marker position should not have changed (watcher was stopped)
    expect(marker.position).toBe(positionBeforeUnmount)
  })
})

describe('memory leak prevention - v-if conditional toggle', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPIWithInstances()
    vi.clearAllMocks()
  })

  it('should cleanup markers when toggled off via v-if', async () => {
    const showMarkers = ref(true)
    const Provider = createMapProvider(mocks).Provider

    const Toggle = defineComponent({
      setup() {
        return { showMarkers }
      },
      render() {
        return showMarkers.value
          ? [
              h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 1, lng: 1 } } }),
              h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 2, lng: 2 } } }),
            ]
          : []
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(Toggle) },
    })

    await flushAsync()
    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(2)

    // Toggle off
    showMarkers.value = false
    await flushAsync()

    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }
    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledTimes(2)

    // Toggle back on — should create new markers, not reuse old ones
    showMarkers.value = true
    await flushAsync()

    expect(mocks.MockAdvancedMarkerElement.instances).toHaveLength(4) // 2 old + 2 new

    // New markers should be active
    expect(mocks.MockAdvancedMarkerElement.instances[2]!.map).toBeTruthy()
    expect(mocks.MockAdvancedMarkerElement.instances[3]!.map).toBeTruthy()

    wrapper.unmount()

    // All should be cleaned up
    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }
  })

  it('should handle rapid v-if toggle without leaking', async () => {
    const showMarker = ref(true)
    const Provider = createMapProvider(mocks).Provider

    const Toggle = defineComponent({
      setup() {
        return { showMarker }
      },
      render() {
        return showMarker.value
          ? h(ScriptGoogleMapsAdvancedMarkerElement, { options: { position: { lat: 0, lng: 0 } } })
          : h('div')
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(Toggle) },
    })

    await flushAsync()

    // Rapid toggle: on → off → on → off → on
    for (let i = 0; i < 5; i++) {
      showMarker.value = !showMarker.value
      await flushAsync()
    }

    wrapper.unmount()

    // Every created marker should have been cleaned up
    for (const marker of mocks.MockAdvancedMarkerElement.instances) {
      expect(marker.map).toBeNull()
    }
    // clearInstanceListeners called for every marker
    expect(mocks.mockMapsApi.event.clearInstanceListeners).toHaveBeenCalledTimes(
      mocks.MockAdvancedMarkerElement.instances.length,
    )
  })
})
