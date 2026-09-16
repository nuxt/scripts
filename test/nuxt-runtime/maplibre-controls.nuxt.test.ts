import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import ScriptMapLibreAttributionControl from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreAttributionControl.vue'
import ScriptMapLibreFullscreenControl from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreFullscreenControl.vue'
import ScriptMapLibreGeolocateControl from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreGeolocateControl.vue'
import ScriptMapLibreScaleControl from '../../packages/script/src/runtime/components/MapLibre/ScriptMapLibreScaleControl.vue'
import { MAPLIBRE_MAP_INJECTION_KEY } from '../../packages/script/src/runtime/components/MapLibre/useMapLibreResource'

interface FakeControl {
  kind: string
  options: unknown
  on: (name: string, listener: (event: unknown) => void) => void
  off: (name: string, listener: (event: unknown) => void) => void
  fire: (name: string, event: unknown) => void
  listenerCount: () => number
  setUnit: ReturnType<typeof vi.fn>
}

/** A control that stores its listeners, so a test can fire MapLibre events at it. */
function initControl(target: object, kind: string, options: unknown): FakeControl {
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  return Object.assign(target, {
    kind,
    options,
    on: (name: string, listener: (event: unknown) => void) => {
      listeners.set(name, (listeners.get(name) ?? new Set()).add(listener))
    },
    off: (name: string, listener: (event: unknown) => void) => {
      listeners.get(name)?.delete(listener)
    },
    fire: (name: string, event: unknown) => listeners.get(name)?.forEach(listener => listener(event)),
    listenerCount: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
    setUnit: vi.fn(),
  })
}

/**
 * The control list follows MapLibre: `addControl` appends, `removeControl`
 * splices, `hasControl` reads the list, and `remove()` empties it.
 */
function createMap() {
  const positions = new Map<unknown, string | undefined>()
  const map = {
    _controls: [] as FakeControl[],
    _removed: false,
    addControl: vi.fn((control: FakeControl, position?: string) => {
      map._controls.push(control)
      positions.set(control, position)
      return map
    }),
    removeControl: vi.fn((control: FakeControl) => {
      map._controls = map._controls.filter(existing => existing !== control)
      return map
    }),
    hasControl: (control: FakeControl) => map._controls.includes(control),
    remove: () => {
      map._controls = []
      map._removed = true
    },
    positionOf: (control: unknown) => positions.get(control),
  }
  return map
}

function createMapLibre() {
  function ScaleControl(this: object, options: unknown) {
    initControl(this, 'scale', options)
  }
  function FullscreenControl(this: object, options: unknown) {
    initControl(this, 'fullscreen', options)
  }
  function GeolocateControl(this: object, options: unknown) {
    initControl(this, 'geolocate', options)
  }
  function AttributionControl(this: object, options: unknown) {
    initControl(this, 'attribution', options)
  }
  return { ScaleControl, FullscreenControl, GeolocateControl, AttributionControl }
}

function provideMap(maplibre: unknown, map: unknown) {
  return {
    provide: {
      [MAPLIBRE_MAP_INJECTION_KEY as symbol]: {
        map: shallowRef(map),
        maplibre: shallowRef(maplibre),
      },
    },
  }
}

function controlsOf(map: ReturnType<typeof createMap>, kind: string) {
  return map._controls.filter(control => control.kind === kind)
}

function stubGeolocation(state: PermissionState | 'no-api' | 'rejects') {
  if (state === 'no-api') {
    vi.stubGlobal('navigator', {})
    return
  }
  vi.stubGlobal('navigator', {
    geolocation: {},
    permissions: {
      query: state === 'rejects'
        ? () => Promise.reject(new TypeError('geolocation is not a valid permission name'))
        : () => Promise.resolve({ state }),
    },
  })
}

async function flush() {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mapLibre scale control', () => {
  it('waits for the map, then adds the control once', async () => {
    const maplibre = createMapLibre()
    const map = createMap()
    const mapRef = shallowRef<unknown>()
    mount(ScriptMapLibreScaleControl, {
      props: { position: 'bottom-left', options: { unit: 'metric' } },
      global: { provide: { [MAPLIBRE_MAP_INJECTION_KEY as symbol]: { map: mapRef, maplibre: shallowRef(maplibre) } } },
    })
    await nextTick()
    expect(map.addControl).not.toHaveBeenCalled()

    mapRef.value = map
    await nextTick()
    const [scale] = controlsOf(map, 'scale')
    expect(controlsOf(map, 'scale')).toHaveLength(1)
    expect(scale!.options).toEqual({ unit: 'metric' })
    expect(map.positionOf(scale)).toBe('bottom-left')
  })

  it('updates the unit in place and removes the control on unmount', async () => {
    const map = createMap()
    const wrapper = mount(ScriptMapLibreScaleControl, {
      props: { options: { unit: 'metric' } },
      global: provideMap(createMapLibre(), map),
    })
    await nextTick()
    const [scale] = controlsOf(map, 'scale')

    await wrapper.setProps({ options: { unit: 'imperial' } })
    expect(scale!.setUnit).toHaveBeenCalledWith('imperial')
    expect(map.addControl).toHaveBeenCalledOnce()

    wrapper.unmount()
    expect(map._controls).toEqual([])
  })
})

describe('mapLibre fullscreen control', () => {
  it('re-emits fullscreen events and detaches on unmount', async () => {
    const map = createMap()
    const wrapper = mount(ScriptMapLibreFullscreenControl, {
      props: { position: 'top-left', options: { pseudo: true } },
      global: provideMap(createMapLibre(), map),
    })
    await nextTick()
    const [fullscreen] = controlsOf(map, 'fullscreen')
    expect(map.positionOf(fullscreen)).toBe('top-left')
    expect(fullscreen!.options).toEqual({ pseudo: true })

    fullscreen!.fire('fullscreenstart', { type: 'fullscreenstart' })
    fullscreen!.fire('fullscreenend', { type: 'fullscreenend' })
    expect(wrapper.emitted('fullscreenstart')).toEqual([[{ type: 'fullscreenstart' }]])
    expect(wrapper.emitted('fullscreenend')).toEqual([[{ type: 'fullscreenend' }]])

    wrapper.unmount()
    expect(map._controls).toEqual([])
    expect(fullscreen!.listenerCount()).toBe(0)
  })
})

describe('mapLibre geolocate control', () => {
  it('re-emits position and permission errors from the control', async () => {
    stubGeolocation('prompt')
    const map = createMap()
    const wrapper = mount(ScriptMapLibreGeolocateControl, {
      props: { position: 'top-right', options: { trackUserLocation: true } },
      global: provideMap(createMapLibre(), map),
    })
    await flush()
    const [geolocate] = controlsOf(map, 'geolocate')
    expect(map.positionOf(geolocate)).toBe('top-right')

    const position = { type: 'geolocate', coords: { latitude: -42.88, longitude: 147.33 } }
    const denied = { type: 'error', code: 1, message: 'User denied Geolocation' }
    geolocate!.fire('geolocate', position)
    geolocate!.fire('error', denied)
    geolocate!.fire('trackuserlocationstart', { type: 'trackuserlocationstart' })

    expect(wrapper.emitted('geolocate')).toEqual([[position]])
    expect(wrapper.emitted('error')).toEqual([[denied]])
    expect(wrapper.emitted('trackuserlocationstart')).toHaveLength(1)
    expect(wrapper.emitted('unavailable')).toBeUndefined()

    wrapper.unmount()
    expect(map._controls).toEqual([])
    expect(geolocate!.listenerCount()).toBe(0)
  })

  it.each([
    ['denied', 'permission-denied'],
    ['no-api', 'unsupported'],
  ] as const)('emits unavailable when the permission state is %s', async (state, reason) => {
    stubGeolocation(state)
    const wrapper = mount(ScriptMapLibreGeolocateControl, {
      global: provideMap(createMapLibre(), createMap()),
    })
    await flush()
    expect(wrapper.emitted('unavailable')).toEqual([[reason]])
  })

  it('trusts the geolocation API when the permission query rejects', async () => {
    stubGeolocation('rejects')
    const wrapper = mount(ScriptMapLibreGeolocateControl, {
      global: provideMap(createMapLibre(), createMap()),
    })
    await flush()
    expect(wrapper.emitted('unavailable')).toBeUndefined()
  })

  it('does not emit unavailable after unmount', async () => {
    stubGeolocation('denied')
    const wrapper = mount(ScriptMapLibreGeolocateControl, {
      global: provideMap(createMapLibre(), createMap()),
    })
    await nextTick()
    wrapper.unmount()
    await flush()
    expect(wrapper.emitted('unavailable')).toBeUndefined()
  })
})

describe('mapLibre attribution control', () => {
  function mapWithDefaultAttribution(maplibre: ReturnType<typeof createMapLibre>, options: Record<string, unknown> = { compact: true }) {
    const map = createMap()
    const builtIn = new (maplibre.AttributionControl as any)(options) as FakeControl
    map.addControl(builtIn)
    map.addControl.mockClear()
    return { map, builtIn }
  }

  it('replaces the map default so attribution shows once, then restores it', async () => {
    const maplibre = createMapLibre()
    const { map, builtIn } = mapWithDefaultAttribution(maplibre)
    const wrapper = mount(ScriptMapLibreAttributionControl, {
      props: { position: 'bottom-left', options: { compact: false } },
      global: provideMap(maplibre, map),
    })
    await nextTick()

    const mounted = controlsOf(map, 'attribution')
    expect(mounted).toHaveLength(1)
    expect(mounted[0]).not.toBe(builtIn)
    expect(mounted[0]!.options).toMatchObject({ compact: false })
    expect(map.positionOf(mounted[0])).toBe('bottom-left')

    wrapper.unmount()
    expect(controlsOf(map, 'attribution')).toEqual([builtIn])
  })

  it('adds and removes its own control when the map has no default', async () => {
    const map = createMap()
    const wrapper = mount(ScriptMapLibreAttributionControl, {
      global: provideMap(createMapLibre(), map),
    })
    await nextTick()
    expect(controlsOf(map, 'attribution')).toHaveLength(1)

    wrapper.unmount()
    expect(map._controls).toEqual([])
  })

  it('restores the map default when adding its own control throws', async () => {
    const maplibre = createMapLibre()
    const { map, builtIn } = mapWithDefaultAttribution(maplibre)
    const failure = new Error('onAdd failed')
    map.addControl.mockImplementationOnce(() => {
      throw failure
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(ScriptMapLibreAttributionControl, {
      global: provideMap(maplibre, map),
    })
    await nextTick()

    expect(controlsOf(map, 'attribution')).toEqual([builtIn])
    expect(consoleError).toHaveBeenCalledWith('[nuxt-scripts] MapLibre resource creation failed:', failure)
    consoleError.mockRestore()
  })

  it('keeps credits the map default configured unless the component sets its own', async () => {
    const maplibre = createMapLibre()
    const { map } = mapWithDefaultAttribution(maplibre, { compact: true, customAttribution: 'Data: Hobart City Council' })
    const inheriting = mount(ScriptMapLibreAttributionControl, {
      props: { options: { compact: false } },
      global: provideMap(maplibre, map),
    })
    await nextTick()
    expect(controlsOf(map, 'attribution')[0]!.options).toEqual({ compact: false, customAttribution: ['Data: Hobart City Council'] })
    inheriting.unmount()

    const overriding = mount(ScriptMapLibreAttributionControl, {
      props: { options: { customAttribution: 'Data: Tasmania' } },
      global: provideMap(maplibre, map),
    })
    await nextTick()
    expect(controlsOf(map, 'attribution')[0]!.options).toEqual({ compact: true, customAttribution: 'Data: Tasmania' })
    overriding.unmount()
  })

  it('keeps the credits of every replaced attribution control', async () => {
    const maplibre = createMapLibre()
    const { map } = mapWithDefaultAttribution(maplibre, { compact: true, customAttribution: 'MapLibre' })
    map.addControl(new (maplibre.AttributionControl as any)({ customAttribution: ['Data: Hobart City Council', 'MapLibre'] }))
    const wrapper = mount(ScriptMapLibreAttributionControl, {
      global: provideMap(maplibre, map),
    })
    await nextTick()

    const [mounted] = controlsOf(map, 'attribution')
    expect(controlsOf(map, 'attribution')).toHaveLength(1)
    expect((mounted!.options as { customAttribution: unknown }).customAttribution).toEqual(['MapLibre', 'Data: Hobart City Council'])
    wrapper.unmount()
    expect(controlsOf(map, 'attribution')).toHaveLength(2)
  })

  it('restores the map default after consumer code removed the component control', async () => {
    const maplibre = createMapLibre()
    const { map, builtIn } = mapWithDefaultAttribution(maplibre)
    const wrapper = mount(ScriptMapLibreAttributionControl, {
      global: provideMap(maplibre, map),
    })
    await nextTick()

    map.removeControl(controlsOf(map, 'attribution')[0]!)
    wrapper.unmount()
    expect(controlsOf(map, 'attribution')).toEqual([builtIn])
  })

  it('does not restore onto a map that was already removed', async () => {
    const maplibre = createMapLibre()
    const { map } = mapWithDefaultAttribution(maplibre)
    const wrapper = mount(ScriptMapLibreAttributionControl, {
      global: provideMap(maplibre, map),
    })
    await nextTick()

    map.remove()
    wrapper.unmount()
    expect(map._controls).toEqual([])
  })
})
