/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScript } from '../../packages/script/src/runtime/composables/useScript'

const mocks = vi.hoisted(() => {
  const baseRemove = vi.fn(() => true)
  const baseLoad = vi.fn(() => Promise.resolve({}))
  const instance = {
    id: 'https://example.com/sdk.js',
    status: { value: 'awaitingLoad' },
    entry: undefined,
    load: baseLoad,
    remove: baseRemove,
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
    head,
    instance,
    unheadUseScript: vi.fn(() => instance),
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
    Object.assign(mocks.instance, {
      id: 'https://example.com/sdk.js',
      status: { value: 'awaitingLoad' },
      entry: undefined,
      load: mocks.baseLoad,
      remove: mocks.baseRemove,
    })
    delete (mocks.instance as any).reload
    delete (mocks.instance as any).toJSON
  })

  it('decorates a shared Unhead instance only once and removes its registry entry', () => {
    const first = useScript('https://example.com/sdk.js')
    const decoratedRemove = first.remove
    const second = useScript('https://example.com/sdk.js')

    // Unhead still sees both callers so it can register their scoped callbacks.
    expect(mocks.unheadUseScript).toHaveBeenCalledTimes(2)
    // App-global wrappers and teardown hooks belong to the shared instance.
    expect(second).toBe(first)
    expect(second.remove).toBe(decoratedRemove)
    expect(mocks.app.hooks.hook).toHaveBeenCalledTimes(1)

    expect(first.remove()).toBe(true)
    expect(mocks.baseRemove).toHaveBeenCalledOnce()
    expect(mocks.app.$scripts).not.toHaveProperty('https://example.com/sdk.js')
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
