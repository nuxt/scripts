/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onUnmounted, provide, ref, shallowRef } from 'vue'
import { MAP_INJECTION_KEY, useGoogleMapsResource, waitForMapsReady } from '../../packages/script/src/runtime/components/GoogleMaps/useGoogleMapsResource'
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

describe('waitForMapsReady', () => {
  // Regression: the previous resolveQueryToLatLng wait pattern used a
  // non-immediate watch after `await load()`. If load() populated mapsApi
  // synchronously, the watcher missed the change and the promise hung
  // forever. The fix re-checks state after load() and uses an immediate
  // watcher (matching importLibrary's pattern). It also waits for `map`
  // to be set, since PlacesService construction requires it.

  it('returns immediately when both refs are already populated', async () => {
    const mapsApi = shallowRef<any>({ places: {} })
    const map = shallowRef<any>({})
    const status = ref<string>('loaded')
    const load = vi.fn(() => Promise.resolve())

    await waitForMapsReady({ mapsApi, map, status, load })

    // Should not have called load() at all
    expect(load).not.toHaveBeenCalled()
  })

  it('does not hang when load() resolves synchronously', async () => {
    // Reproduces the original race: load() populates mapsApi synchronously,
    // so a non-immediate watcher would never fire.
    const mapsApi = shallowRef<any>(undefined)
    const map = shallowRef<any>(undefined)
    const status = ref<string>('loading')
    const load = vi.fn(() => {
      // Synchronously populate both refs before returning the resolved promise
      mapsApi.value = { places: {} }
      map.value = {}
      return Promise.resolve()
    })

    // Race against a timeout to detect the hang
    await expect(
      Promise.race([
        waitForMapsReady({ mapsApi, map, status, load }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('hang')), 100)),
      ]),
    ).resolves.toBeUndefined()

    expect(load).toHaveBeenCalledOnce()
  })

  it('resolves when refs are populated asynchronously after load()', async () => {
    const mapsApi = shallowRef<any>(undefined)
    const map = shallowRef<any>(undefined)
    const status = ref<string>('loading')
    const load = vi.fn(() => Promise.resolve())

    const promise = waitForMapsReady({ mapsApi, map, status, load })

    // Populate refs after a tick — simulates the normal onLoaded flow
    await nextTick()
    mapsApi.value = { places: {} }
    await nextTick()
    map.value = {}

    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects synchronously when status is already error', async () => {
    const mapsApi = shallowRef<any>(undefined)
    const map = shallowRef<any>(undefined)
    const status = ref<string>('error')
    const load = vi.fn(() => Promise.resolve())

    await expect(
      waitForMapsReady({ mapsApi, map, status, load }),
    ).rejects.toThrow('Google Maps script failed to load')

    // Should bail before calling load()
    expect(load).not.toHaveBeenCalled()
  })

  it('rejects when status transitions to error during the wait', async () => {
    const mapsApi = shallowRef<any>(undefined)
    const map = shallowRef<any>(undefined)
    const status = ref<string>('loading')
    const load = vi.fn(() => Promise.resolve())

    const promise = waitForMapsReady({ mapsApi, map, status, load })

    await nextTick()
    status.value = 'error'

    await expect(promise).rejects.toThrow('Google Maps script failed to load')
  })

  it('waits for map even when mapsApi is set first', async () => {
    // Guards against the second bug: PlacesService construction needs
    // map.value, not just mapsApi.value.
    const mapsApi = shallowRef<any>({ places: {} })
    const map = shallowRef<any>(undefined)
    const status = ref<string>('loading')
    const load = vi.fn(() => Promise.resolve())

    const promise = waitForMapsReady({ mapsApi, map, status, load })

    // Race against a short timeout: should NOT resolve yet
    const racedEarly = await Promise.race([
      promise.then(() => 'resolved'),
      new Promise(resolve => setTimeout(resolve, 30, 'pending')),
    ])
    expect(racedEarly).toBe('pending')

    map.value = {}
    await expect(promise).resolves.toBeUndefined()
  })
})
