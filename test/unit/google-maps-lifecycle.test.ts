/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onUnmounted, provide, ref, shallowRef } from 'vue'
import { MAP_INJECTION_KEY } from '../../src/runtime/components/GoogleMaps/injectionKeys'
import { useGoogleMapsResource } from '../../src/runtime/components/GoogleMaps/useGoogleMapsResource'
import { createMockGoogleMapsAPI } from './__mocks__/google-maps-api'

// Helper to create a wrapper component that provides mock map context
function createMapProvider(mocks: ReturnType<typeof createMockGoogleMapsAPI>, opts?: { immediate?: boolean }) {
  const map = shallowRef<any>(opts?.immediate !== false ? {} : undefined)
  const mapsApi = ref<any>(opts?.immediate !== false ? mocks.mockMapsApi : undefined)

  return defineComponent({
    setup(_, { slots }) {
      provide(MAP_INJECTION_KEY, { map, mapsApi } as any)
      return () => h('div', slots.default?.())
    },
    // Expose refs for test manipulation
    data: () => ({ map, mapsApi }),
  })
}

describe('useGoogleMapsResource', () => {
  let mocks: ReturnType<typeof createMockGoogleMapsAPI>

  beforeEach(() => {
    mocks = createMockGoogleMapsAPI()
    vi.clearAllMocks()
  })

  it('should create resource when map context is ready', async () => {
    const createFn = vi.fn(() => ({ id: 'test-resource' }))
    const Provider = createMapProvider(mocks)

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

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()
    await nextTick()

    expect(createFn).toHaveBeenCalledOnce()
    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({ map: expect.anything(), mapsApi: expect.anything() }),
    )

    wrapper.unmount()
  })

  it('should call cleanup on unmount and null the resource ref', async () => {
    const resource = { id: 'test-resource' }
    const cleanupFn = vi.fn()
    const Provider = createMapProvider(mocks)

    const Child = defineComponent({
      setup() {
        const ref = useGoogleMapsResource({
          create: () => resource,
          cleanup: cleanupFn,
        })
        return { ref }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()
    await nextTick()

    // Verify resource was created
    const child = wrapper.findComponent(Child)
    expect(child.vm.ref).toBe(resource)

    // Unmount
    wrapper.unmount()

    expect(cleanupFn).toHaveBeenCalledWith(resource, { mapsApi: mocks.mockMapsApi })
  })

  it('should not create resource if unmounted during async creation', async () => {
    let resolveCreate: (value: any) => void
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve
    })
    const cleanupFn = vi.fn()
    const Provider = createMapProvider(mocks)
    let resourceRef: any

    const Child = defineComponent({
      setup() {
        const resource = useGoogleMapsResource({
          create: () => createPromise,
          cleanup: cleanupFn,
        })
        resourceRef = resource
        return { resource }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()

    // Unmount before create resolves
    wrapper.unmount()

    // Now resolve the create
    const resource = { id: 'created-after-unmount' }
    resolveCreate!(resource)
    await nextTick()

    // Resource should NOT be assigned (ref was nulled on unmount)
    expect(resourceRef.value).toBeUndefined()

    // Cleanup should be called on the newly created resource to prevent leak
    expect(cleanupFn).toHaveBeenCalledWith(resource, { mapsApi: mocks.mockMapsApi })
  })

  it('should not create resource if map context is not ready', async () => {
    const createFn = vi.fn(() => ({ id: 'test' }))
    const Provider = createMapProvider(mocks, { immediate: false })

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

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()
    await nextTick()

    expect(createFn).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('should respect additional ready condition', async () => {
    const createFn = vi.fn(() => ({ id: 'test' }))
    const isReady = ref(false)
    const Provider = createMapProvider(mocks)

    const Child = defineComponent({
      setup() {
        const resource = useGoogleMapsResource({
          ready: () => isReady.value,
          create: createFn,
        })
        return { resource }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()
    await nextTick()

    expect(createFn).not.toHaveBeenCalled()

    isReady.value = true
    await nextTick()
    await nextTick()

    expect(createFn).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('should only call create once (once: true semantics)', async () => {
    const createFn = vi.fn(() => ({ id: 'test' }))
    const Provider = createMapProvider(mocks)

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

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()
    await nextTick()
    await nextTick()

    expect(createFn).toHaveBeenCalledOnce()

    wrapper.unmount()
  })
})

describe('google Maps component lifecycle - memory leak prevention', () => {
  let mocks: ReturnType<typeof createMockGoogleMapsAPI>

  beforeEach(() => {
    mocks = createMockGoogleMapsAPI()
    vi.clearAllMocks()
  })

  it('should not leave orphaned watchers after unmount', async () => {
    // This test verifies the core fix: options watchers are created in sync setup scope
    // and auto-stopped by Vue on unmount, rather than being orphaned after an await
    const Provider = createMapProvider(mocks)
    const unmountedCallbacks: (() => void)[] = []

    const Child = defineComponent({
      setup() {
        const resource = useGoogleMapsResource({
          create() {
            return { id: 'test', setOptions: vi.fn() }
          },
          cleanup(r) {
            // Resource should be cleaned up
            expect(r.id).toBe('test')
          },
        })

        onUnmounted(() => {
          unmountedCallbacks.push(() => {
            // After unmount, the resource ref should be undefined
            expect(resource.value).toBeUndefined()
          })
        })

        return { resource }
      },
      render() {
        return h('div')
      },
    })

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()
    await nextTick()

    wrapper.unmount()

    // Run post-unmount checks
    unmountedCallbacks.forEach(cb => cb())
  })

  it('should handle rapid mount/unmount cycles without leaking', async () => {
    const Provider = createMapProvider(mocks)
    const cleanupCount = ref(0)

    const Child = defineComponent({
      setup() {
        useGoogleMapsResource({
          create: () => ({ id: Math.random() }),
          cleanup: () => { cleanupCount.value++ },
        })
        return {}
      },
      render() {
        return h('div')
      },
    })

    // Rapid mount/unmount cycle
    for (let i = 0; i < 5; i++) {
      const wrapper = mount(Provider, {
        slots: { default: () => h(Child) },
      })
      await nextTick()
      await nextTick()
      wrapper.unmount()
    }

    // Each mount should have resulted in a cleanup
    expect(cleanupCount.value).toBe(5)
  })

  it('should cleanup resources created during async gap after unmount', async () => {
    // Simulates: component mounts → starts async importLibrary → unmounts → import resolves → resource created
    // The composable should clean up the resource even though the component is already unmounted
    const cleanupFn = vi.fn()
    const Provider = createMapProvider(mocks)

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

    const wrapper = mount(Provider, {
      slots: { default: () => h(Child) },
    })

    await nextTick()

    // Unmount while import is pending
    wrapper.unmount()

    // Resolve the import — this creates the resource after unmount
    resolveImport!()
    await nextTick()
    await nextTick()

    // The composable should have cleaned up the post-unmount resource
    expect(cleanupFn).toHaveBeenCalledOnce()
    expect(cleanupFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'async-resource' }),
      expect.objectContaining({ mapsApi: mocks.mockMapsApi }),
    )
  })
})
