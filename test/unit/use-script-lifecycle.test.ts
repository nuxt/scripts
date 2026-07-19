/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScript } from '../../packages/script/src/runtime/composables/useScript'

const mocks = vi.hoisted(() => {
  const baseRemove = vi.fn(() => true)
  const baseLoad = vi.fn(() => Promise.resolve({}))
  const shared = {
    id: 'https://example.com/sdk.js',
    status: { value: 'awaitingLoad' },
    signal: new AbortController().signal,
    entry: undefined,
    load: baseLoad,
    remove: baseRemove,
  }
  const createScope = () => {
    const controller = new AbortController()
    return Object.assign(Object.create(shared), {
      script: shared,
      signal: controller.signal,
      status: shared.status,
      dispose: () => controller.abort(),
    })
  }
  const head = {
    hooks: {
      hook: vi.fn(() => vi.fn()),
    },
  }
  const app = {
    $scripts: {} as Record<string, any>,
    _scripts: {} as Record<string, any>,
    hooks: {
      hook: vi.fn(() => vi.fn()),
      callHook: vi.fn(),
    },
  }
  return {
    app,
    baseLoad,
    baseRemove,
    createScope,
    head,
    shared,
    unheadUseScript: vi.fn(createScope),
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
    Object.assign(mocks.shared, {
      id: 'https://example.com/sdk.js',
      status: { value: 'awaitingLoad' },
      signal: new AbortController().signal,
      entry: undefined,
      load: mocks.baseLoad,
      remove: mocks.baseRemove,
    })
    delete (mocks.shared as any).reload
    delete (mocks.shared as any).toJSON
    mocks.unheadUseScript.mockImplementation(mocks.createScope)
  })

  it('decorates a shared Unhead instance only once and removes its registry entry', () => {
    const first = useScript('https://example.com/sdk.js')
    const decoratedRemove = first.remove
    const second = useScript('https://example.com/sdk.js')

    // Unhead still sees both callers so it can register their scoped callbacks.
    expect(mocks.unheadUseScript).toHaveBeenCalledTimes(2)
    // Each caller keeps its own scope while app-global wrappers live on the
    // shared backing instance and remain available through inheritance.
    expect(second).not.toBe(first)
    expect(second.script).toBe(first.script)
    expect(second.remove).toBe(decoratedRemove)
    expect(second.reload).toBe(first.reload)
    const appInstance = mocks.app.$scripts['https://example.com/sdk.js']
    expect(appInstance).not.toBe(first)
    expect(Object.getPrototypeOf(appInstance)).toBe(first.script)
    expect(appInstance.remove).toBe(decoratedRemove)
    expect(mocks.app.hooks.hook).toHaveBeenCalledTimes(1)
    expect(mocks.unheadUseScript).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({ scope: true }))

    ;(first as any).dispose()
    expect(first.signal.aborted).toBe(true)
    expect(appInstance.signal.aborted).toBe(false)
    expect(mocks.app.$scripts['https://example.com/sdk.js']).toBe(appInstance)

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

  it('does not bypass validation when reload is called', async () => {
    const validationError = { issues: [{ message: 'invalid test options' }] }
    const instance = useScript('https://example.com/sdk.js', {
      _validate: () => validationError,
    } as any)

    await expect((instance as any).reload()).rejects.toBe(validationError)
    expect(mocks.baseRemove).not.toHaveBeenCalled()
  })
})
