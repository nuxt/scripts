import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ScriptLeafletMap from '../../packages/script/src/runtime/components/Leaflet/ScriptLeafletMap.vue'

const scriptState = vi.hoisted(() => ({
  callbacks: [] as Array<(instance: any) => void>,
  errorCallbacks: [] as Array<(error?: Error) => void>,
  load: vi.fn(() => Promise.resolve()),
  status: undefined as any,
}))

vi.mock('#nuxt-scripts/composables/useScriptTriggerElement', () => ({
  useScriptTriggerElement: vi.fn(() => 'onNuxtReady'),
}))

vi.mock('#nuxt-scripts/registry/leaflet', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  scriptState.status = ref('awaitingLoad')
  return {
    useScriptLeaflet: vi.fn(() => ({
      load: scriptState.load,
      status: scriptState.status,
      onLoaded: (callback: (instance: any) => void) => scriptState.callbacks.push(callback),
      onError: (callback: (error?: Error) => void) => scriptState.errorCallbacks.push(callback),
    })),
  }
})

function createLeafletMock() {
  const events = new Map<string, (event: any) => void>()
  const center = { equals: vi.fn(() => false) }
  const map: Record<string, any> = {
    setView: vi.fn(() => map),
    on: vi.fn((name: string, callback: (event: any) => void) => {
      events.set(name, callback)
      return map
    }),
    getCenter: vi.fn(() => center),
    panTo: vi.fn(() => map),
    getZoom: vi.fn(() => 13),
    setZoom: vi.fn(() => map),
    off: vi.fn(() => map),
    remove: vi.fn(() => map),
  }
  const leaflet = {
    map: vi.fn(() => map),
    latLng: vi.fn(value => value),
  }
  return { leaflet, map, center, events }
}

describe('scriptLeafletMap', () => {
  beforeEach(() => {
    scriptState.callbacks.length = 0
    scriptState.errorCallbacks.length = 0
    scriptState.status.value = 'awaitingLoad'
    vi.clearAllMocks()
  })

  it('initializes, updates, emits model values, and cleans up the map', async () => {
    const mocks = createLeafletMock()
    const wrapper = mount(ScriptLeafletMap, {
      props: {
        center: [-37.8136, 144.9631],
        zoom: 13,
        width: 800,
        height: 500,
      },
    })
    await nextTick()

    expect(scriptState.callbacks).toHaveLength(1)
    scriptState.callbacks[0]!({ L: mocks.leaflet })
    await nextTick()

    expect(mocks.leaflet.map).toHaveBeenCalledWith(expect.any(HTMLElement), {})
    expect(mocks.map.setView).toHaveBeenCalledWith([-37.8136, 144.9631], 13, { animate: false })
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.attributes('style')).toContain('aspect-ratio: 800 / 500')

    await wrapper.setProps({ center: [-37.8304, 144.9796], zoom: 14 })
    expect(mocks.map.panTo).toHaveBeenCalledWith([-37.8304, 144.9796])
    expect(mocks.map.setZoom).toHaveBeenCalledWith(14)

    mocks.events.get('moveend')?.({ type: 'moveend' })
    mocks.events.get('zoomend')?.({ type: 'zoomend' })
    expect(wrapper.emitted('update:center')?.[0]).toEqual([mocks.center])
    expect(wrapper.emitted('update:zoom')?.[0]).toEqual([13])

    wrapper.unmount()
    expect(mocks.map.off).toHaveBeenCalled()
    expect(mocks.map.remove).toHaveBeenCalled()
  })

  it('normalizes pixel string dimensions into a valid aspect ratio', async () => {
    const wrapper = mount(ScriptLeafletMap, {
      props: {
        center: [0, 0],
        width: '800px',
        height: '500px',
      },
    })

    expect(wrapper.attributes('style')).toContain('aspect-ratio: 800 / 500')
    wrapper.unmount()
  })

  it('renders a visible error and makes decorative maps inert', async () => {
    const wrapper = mount(ScriptLeafletMap, {
      props: {
        center: [0, 0],
        interactive: false,
      },
    })

    const loadFailure = new Error('Leaflet request failed')
    scriptState.errorCallbacks[0]!(loadFailure)
    scriptState.status.value = 'error'
    await nextTick()

    expect(wrapper.get('[role="alert"]').text()).toBe('The map could not be loaded.')
    expect(wrapper.emitted('error')?.[0]).toEqual([loadFailure])
    expect(wrapper.get('[aria-hidden="true"]').attributes()).toHaveProperty('inert')
  })
})
