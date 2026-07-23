import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ScriptMapLibreMap from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreMap.vue'

const scriptState = vi.hoisted(() => ({
  callbacks: [] as Array<(instance: any) => void>,
  errorCallbacks: [] as Array<(error?: Error) => void>,
  load: vi.fn(() => Promise.resolve()),
  status: undefined as any,
}))

vi.mock('#nuxt-scripts/composables/useScriptTriggerElement', () => ({
  useScriptTriggerElement: vi.fn(() => Promise.resolve()),
}))

vi.mock('#nuxt-scripts/registry/maplibre', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  scriptState.status = ref('awaitingLoad')
  return {
    useScriptMapLibre: vi.fn(() => ({
      load: scriptState.load,
      status: scriptState.status,
      onLoaded: (callback: (instance: any) => void) => scriptState.callbacks.push(callback),
      onError: (callback: (error?: Error) => void) => scriptState.errorCallbacks.push(callback),
    })),
  }
})

function createMapLibreMock() {
  const events = new Map<string, (event: any) => void>()
  const onceEvents = new Map<string, (event: any) => void>()
  const center = { lng: 144.9631, lat: -37.8136 }
  const map: Record<string, any> = {
    on: vi.fn((name: string, callback: (event: any) => void) => {
      events.set(name, callback)
      return map
    }),
    once: vi.fn((name: string, callback: (event: any) => void) => {
      onceEvents.set(name, callback)
      return map
    }),
    getCenter: vi.fn(() => center),
    getZoom: vi.fn(() => 12),
    getBearing: vi.fn(() => 0),
    getPitch: vi.fn(() => 0),
    jumpTo: vi.fn(() => map),
    setStyle: vi.fn(() => map),
    resize: vi.fn(() => map),
    remove: vi.fn(),
  }
  let mapConstructionError: Error | undefined

  function MapConstructor() {
    if (mapConstructionError)
      throw mapConstructionError
    return map
  }

  const maplibregl = {
    Map: vi.fn(MapConstructor),
    LngLat: { convert: vi.fn(value => ({ lng: value[0], lat: value[1] })) },
  }
  return {
    maplibregl,
    map,
    center,
    events,
    onceEvents,
    failMapConstruction(error: Error) {
      mapConstructionError = error
    },
  }
}

describe('scriptMapLibreMap', () => {
  beforeEach(() => {
    scriptState.callbacks.length = 0
    scriptState.errorCallbacks.length = 0
    scriptState.status.value = 'awaitingLoad'
    vi.clearAllMocks()
  })

  it('initializes, updates, emits model values, and cleans up the map', async () => {
    const mocks = createMapLibreMock()
    const wrapper = mount(ScriptMapLibreMap, {
      props: {
        mapStyle: 'https://demotiles.maplibre.org/style.json',
        center: [144.9631, -37.8136],
        zoom: 12,
        width: 800,
        height: 500,
      },
      slots: {
        description: () => 'Melbourne streets and landmarks',
      },
    })
    await nextTick()

    expect(scriptState.callbacks).toHaveLength(1)
    scriptState.callbacks[0]!({ maplibregl: mocks.maplibregl })
    await nextTick()

    expect(mocks.maplibregl.Map).toHaveBeenCalledWith(expect.objectContaining({
      center: [144.9631, -37.8136],
      container: expect.any(HTMLElement),
      interactive: true,
      style: 'https://demotiles.maplibre.org/style.json',
      zoom: 12,
    }))
    expect(wrapper.attributes('style')).toContain('aspect-ratio: 800 / 500')
    expect(wrapper.get('[role="region"]').attributes('aria-describedby')).toBeTruthy()

    mocks.onceEvents.get('load')?.({ type: 'load' })
    await nextTick()
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(mocks.map.resize).toHaveBeenCalledOnce()

    await wrapper.setProps({ center: [144.9796, -37.8304], zoom: 13, bearing: 20, pitch: 30 })
    expect(mocks.map.jumpTo).toHaveBeenCalledWith({ center: { lng: 144.9796, lat: -37.8304 } })
    expect(mocks.map.jumpTo).toHaveBeenCalledWith({ zoom: 13 })
    expect(mocks.map.jumpTo).toHaveBeenCalledWith({ bearing: 20 })
    expect(mocks.map.jumpTo).toHaveBeenCalledWith({ pitch: 30 })

    mocks.events.get('moveend')?.({ type: 'moveend' })
    mocks.events.get('zoomend')?.({ type: 'zoomend' })
    mocks.events.get('rotateend')?.({ type: 'rotateend' })
    mocks.events.get('pitchend')?.({ type: 'pitchend' })
    expect(wrapper.emitted('update:center')?.[0]).toEqual([mocks.center])
    expect(wrapper.emitted('update:zoom')?.[0]).toEqual([12])
    expect(wrapper.emitted('update:bearing')?.[0]).toEqual([0])
    expect(wrapper.emitted('update:pitch')?.[0]).toEqual([0])

    wrapper.unmount()
    expect(mocks.map.remove).toHaveBeenCalledOnce()
  })

  it('renders script errors and makes decorative maps inert', async () => {
    const wrapper = mount(ScriptMapLibreMap, {
      props: {
        mapStyle: 'https://demotiles.maplibre.org/style.json',
        center: [0, 0],
        interactive: false,
      },
    })

    const loadFailure = new Error('MapLibre request failed')
    scriptState.errorCallbacks[0]!(loadFailure)
    scriptState.status.value = 'error'
    await nextTick()

    expect(wrapper.get('[role="alert"]').text()).toBe('The map could not be loaded.')
    expect(wrapper.emitted('error')?.[0]).toEqual([loadFailure])
    expect(wrapper.get('[aria-hidden="true"]').attributes()).toHaveProperty('inert')
  })

  it('surfaces synchronous map initialization failures', async () => {
    const mocks = createMapLibreMock()
    const initializationFailure = new Error('Invalid MapLibre options')
    mocks.failMapConstruction(initializationFailure)
    const wrapper = mount(ScriptMapLibreMap, {
      props: {
        mapStyle: 'https://demotiles.maplibre.org/style.json',
        center: [0, 0],
      },
    })
    await nextTick()

    scriptState.callbacks[0]!({ maplibregl: mocks.maplibregl })
    await nextTick()

    expect(wrapper.get('[role="alert"]').text()).toBe('The map could not be loaded.')
    expect(wrapper.emitted('error')?.[0]).toEqual([initializationFailure])
    expect(wrapper.emitted('ready')).toBeUndefined()
  })
})
