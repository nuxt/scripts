/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScript } from '../../packages/script/src/runtime/composables/useScript'

const mocks = vi.hoisted(() => {
  const baseRemove = vi.fn(() => true)
  const baseLoad = vi.fn(() => Promise.resolve({}))
  const shared = {
    id: 'https://example.com/sdk.js',
    status: { value: 'awaitingLoad' },
    _statusRef: { value: 'awaitingLoad' },
    signal: new AbortController().signal,
    entry: undefined,
    load: baseLoad,
    remove: baseRemove,
  }
  const createHandle = (target = shared) => {
    return new Proxy(target, {
      get(_, key, receiver) {
        return Reflect.get(_, key === 'status' ? '_statusRef' : key, receiver)
      },
    })
  }
  const head = {
    hooks: {
      hook: vi.fn(() => vi.fn()),
    },
  }
  const appHookCallbacks = new Map<string, (() => void)[]>()
  const app = {
    $scripts: {} as Record<string, any>,
    _scripts: {} as Record<string, any>,
    hooks: {
      hook: vi.fn((name: string, callback: () => void) => {
        const callbacks = appHookCallbacks.get(name) || []
        callbacks.push(callback)
        appHookCallbacks.set(name, callbacks)
        return vi.fn()
      }),
      callHook: vi.fn(),
    },
  }
  return {
    app,
    appHookCallbacks,
    baseLoad,
    baseRemove,
    createHandle,
    head,
    shared,
    unheadUseScript: vi.fn(createHandle),
  }
})

vi.mock('@unhead/vue/scripts', () => ({
  useScript: mocks.unheadUseScript,
}))

vi.mock('nuxt/app', () => ({
  injectHead: () => mocks.head,
  onNuxtReady: vi.fn(),
  useHead: vi.fn(),
  useNuxtApp: () => mocks.app,
  useRuntimeConfig: () => ({
    public: {
      'nuxt-scripts': { defaultScriptOptions: {} },
      'nuxt-scripts-devtools': {},
    },
  }),
}))

vi.mock('#build/nuxt-scripts-trigger-resolver', () => ({
  resolveTrigger: vi.fn(),
}))

describe('useScript shared instance lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.app.$scripts = {}
    mocks.app._scripts = {}
    mocks.appHookCallbacks.clear()
    Object.assign(mocks.shared, {
      id: 'https://example.com/sdk.js',
      status: { value: 'awaitingLoad' },
      _statusRef: { value: 'awaitingLoad' },
      signal: new AbortController().signal,
      entry: undefined,
      load: mocks.baseLoad,
      remove: mocks.baseRemove,
    })
    delete (mocks.shared as any).reload
    delete (mocks.shared as any).toJSON
    mocks.unheadUseScript.mockImplementation(() => mocks.createHandle())
  })

  it('decorates a shared Unhead instance only once and removes its registry entry', () => {
    const first = useScript('https://example.com/sdk.js')
    const decoratedRemove = first.remove
    const second = useScript('https://example.com/sdk.js')

    // Unhead still sees both callers so Vue can bind their callbacks to the
    // active component scope.
    expect(mocks.unheadUseScript).toHaveBeenCalledTimes(2)
    expect(second).not.toBe(first)
    expect(second.remove).toBe(decoratedRemove)
    expect(second.reload).toBe(first.reload)
    const appInstance = mocks.app.$scripts['https://example.com/sdk.js']
    expect(appInstance).toBe(first)
    expect(appInstance.remove).toBe(decoratedRemove)
    expect(mocks.app.hooks.hook).toHaveBeenCalledTimes(1)
    expect(mocks.unheadUseScript.mock.calls[0]?.[1]).not.toHaveProperty('scope')

    expect(first.remove()).toBe(true)
    expect(mocks.baseRemove).toHaveBeenCalledOnce()
    expect(mocks.app.$scripts).not.toHaveProperty('https://example.com/sdk.js')
  })

  it('preserves shared identity with older Unhead versions', () => {
    mocks.unheadUseScript.mockReturnValue(mocks.shared as any)

    const first = useScript('https://example.com/sdk.js')
    const second = useScript('https://example.com/sdk.js')

    expect(second).toBe(first)
    expect(mocks.app.$scripts['https://example.com/sdk.js']).toBe(first)
  })

  it('releases event context added by older Vue integrations', () => {
    mocks.unheadUseScript.mockImplementation((_input, options) => {
      options.eventContext = { component: true }
      return mocks.createHandle()
    })

    useScript('https://example.com/sdk.js')

    expect(mocks.unheadUseScript.mock.calls[0]?.[1]).not.toHaveProperty('eventContext')
  })

  it('runs provider cleanup wrappers during app teardown', () => {
    const instance = useScript('https://example.com/sdk.js')
    const remove = instance.remove
    const providerRemove = vi.fn(() => remove())
    instance.remove = providerRemove

    mocks.appHookCallbacks.get('app:unmount')?.[0]?.()

    expect(providerRemove).toHaveBeenCalledOnce()
    expect(mocks.baseRemove).toHaveBeenCalledOnce()
  })

  it('keeps the public status ref live across reloads without requesting a scope', async () => {
    const reloadedStatus = ref('loading')
    const reloadedLoad = vi.fn(() => {
      reloadedStatus.value = 'loaded'
      return Promise.resolve({ ready: true })
    })
    const reloaded = {
      id: 'reload-script',
      _statusRef: reloadedStatus,
      status: 'loading',
      entry: { dispose: vi.fn() },
      load: reloadedLoad,
      remove: vi.fn(() => true),
    }
    mocks.unheadUseScript
      .mockImplementationOnce(() => mocks.createHandle())
      .mockImplementationOnce(() => mocks.createHandle(reloaded as any))
    const instance = useScript('https://example.com/sdk.js')
    const status = instance.status

    await expect((instance as any).reload()).resolves.toEqual({ ready: true })

    expect(instance.status).toBe(status)
    expect(status.value).toBe('loaded')
    expect(instance.entry).toBe(reloaded.entry)
    expect(reloadedLoad).toHaveBeenCalledOnce()
    expect(mocks.unheadUseScript.mock.calls[1]?.[1]).not.toHaveProperty('scope')
  })

  it('releases event context added while reloading with older Unhead versions', async () => {
    const reloaded = {
      id: 'reload-script',
      _statusRef: ref('loading'),
      entry: undefined,
      load: vi.fn(() => Promise.resolve({ ready: true })),
      remove: vi.fn(() => true),
    }
    mocks.unheadUseScript
      .mockImplementationOnce(() => mocks.createHandle())
      .mockImplementationOnce((_input, options) => {
        options.eventContext = { component: true }
        return mocks.createHandle(reloaded as any)
      })
    const instance = useScript('https://example.com/sdk.js')

    await (instance as any).reload()

    expect(mocks.unheadUseScript.mock.calls[1]?.[1]).not.toHaveProperty('eventContext')
  })

  it('does not bypass validation when reload is called', async () => {
    const validationError = { issues: [{ message: 'invalid test options' }] }
    const instance = useScript('https://example.com/sdk.js', {
      _validate: () => validationError,
    } as any)

    await expect((instance as any).reload()).rejects.toBe(validationError)
    expect(mocks.baseRemove).not.toHaveBeenCalled()
  })
})
