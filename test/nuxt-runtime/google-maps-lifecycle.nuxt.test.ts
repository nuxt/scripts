/// <reference types="google.maps" />
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, provide, ref, shallowRef } from 'vue'
import { MAP_INJECTION_KEY } from '../../src/runtime/components/GoogleMaps/injectionKeys'
import { useGoogleMapsResource } from '../../src/runtime/components/GoogleMaps/useGoogleMapsResource'
import { createMockGoogleMapsAPI } from '../unit/__mocks__/google-maps-api'

type MockAPI = ReturnType<typeof createMockGoogleMapsAPI>

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

describe('useGoogleMapsResource in Nuxt environment', () => {
  let mocks: MockAPI

  beforeEach(() => {
    mocks = createMockGoogleMapsAPI()
    vi.clearAllMocks()
  })

  it('should create and cleanup resource through full mount/unmount cycle', async () => {
    const { Provider } = createMapProvider(mocks)
    const cleanupFn = vi.fn()

    const Child = defineComponent({
      setup() {
        const resource = useGoogleMapsResource({
          create: () => ({ id: 'test-marker' }),
          cleanup: cleanupFn,
        })
        return { resource }
      },
      render() {
        return this.resource ? h('div', 'marker-ready') : h('div', 'loading')
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(Child) },
    })

    await flushAsync()

    expect(wrapper.text()).toContain('marker-ready')

    wrapper.unmount()

    expect(cleanupFn).toHaveBeenCalledOnce()
    expect(cleanupFn).toHaveBeenCalledWith(
      { id: 'test-marker' },
      { mapsApi: mocks.mockMapsApi },
    )
  })

  it('should handle async resource creation with unmount race condition', async () => {
    const { Provider } = createMapProvider(mocks)
    const cleanupFn = vi.fn()

    let resolveCreate: (v: any) => void
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve
    })

    const Child = defineComponent({
      setup() {
        const resource = useGoogleMapsResource({
          create: () => createPromise,
          cleanup: cleanupFn,
        })
        return { resource }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(Child) },
    })

    await flushAsync()

    // Unmount before creation completes
    wrapper.unmount()

    // Complete creation after unmount
    resolveCreate!({ id: 'late-resource' })
    await flushAsync()

    // Should cleanup the late-created resource
    expect(cleanupFn).toHaveBeenCalledWith(
      { id: 'late-resource' },
      { mapsApi: mocks.mockMapsApi },
    )
  })

  it('should handle deferred map readiness', async () => {
    const { Provider, map, mapsApi } = createMapProvider(mocks, { immediate: false })
    const createFn = vi.fn(() => ({ id: 'deferred' }))

    const Child = defineComponent({
      setup() {
        const resource = useGoogleMapsResource({
          create: createFn,
        })
        return { resource }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(Child) },
    })

    await flushAsync()

    // Not yet created (map not ready)
    expect(createFn).not.toHaveBeenCalled()

    // Make map ready
    map.value = {}
    mapsApi.value = mocks.mockMapsApi
    await flushAsync()

    expect(createFn).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('should handle multiple child components independently', async () => {
    const { Provider } = createMapProvider(mocks)
    const cleanups: string[] = []

    function createChild(id: string) {
      return defineComponent({
        setup() {
          const resource = useGoogleMapsResource({
            create: () => ({ id }),
            cleanup: () => { cleanups.push(id) },
          })
          return { resource }
        },
        render() {
          return h('div', this.resource?.id)
        },
      })
    }

    const Child1 = createChild('marker-1')
    const Child2 = createChild('marker-2')
    const Child3 = createChild('marker-3')

    const wrapper = await mountSuspended(Provider, {
      slots: {
        default: () => [h(Child1), h(Child2), h(Child3)],
      },
    })

    await flushAsync()

    expect(wrapper.text()).toContain('marker-1')
    expect(wrapper.text()).toContain('marker-2')
    expect(wrapper.text()).toContain('marker-3')

    wrapper.unmount()

    // All 3 should be cleaned up independently
    expect(cleanups).toHaveLength(3)
    expect(cleanups).toContain('marker-1')
    expect(cleanups).toContain('marker-2')
    expect(cleanups).toContain('marker-3')
  })

  it('should cleanup resources created during async gap after unmount', async () => {
    const cleanupFn = vi.fn()
    const { Provider } = createMapProvider(mocks)

    let resolveImport: () => void
    const importPromise = new Promise<void>((resolve) => {
      resolveImport = resolve
    })

    const Child = defineComponent({
      setup() {
        useGoogleMapsResource({
          async create({ mapsApi }) {
            await importPromise
            return { id: 'async-resource', mapsApi }
          },
          cleanup: cleanupFn,
        })
        return {}
      },
      render() {
        return h('div')
      },
    })

    const wrapper = await mountSuspended(Provider, {
      slots: { default: () => h(Child) },
    })

    await flushAsync()

    // Unmount while import is pending
    wrapper.unmount()

    // Resolve the import — this creates the resource after unmount
    resolveImport!()
    await flushAsync()

    // The composable should have cleaned up the post-unmount resource
    expect(cleanupFn).toHaveBeenCalledOnce()
    expect(cleanupFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'async-resource' }),
      expect.objectContaining({ mapsApi: mocks.mockMapsApi }),
    )
  })
})
