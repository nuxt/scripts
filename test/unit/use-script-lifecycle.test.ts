/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScript } from '../../packages/script/src/runtime/composables/useScript'

const mocks = vi.hoisted(() => {
  const baseRemove = vi.fn(() => true)
  const baseLoad = vi.fn(() => Promise.resolve({}))
  const shared: any = {
    id: 'https://example.com/sdk.js',
    status: 'awaitingLoad',
    _statusRef: { value: 'awaitingLoad' },
    signal: new AbortController().signal,
    entry: undefined,
    load: baseLoad,
    remove: baseRemove,
  }
  const scopes: any[] = []
  const createScope = (script = shared) => {
    const controller = new AbortController()
    const scope = Object.assign(Object.create(script), {
      script,
      status: script._statusRef,
      signal: controller.signal,
      dispose: vi.fn(() => controller.abort()),
    })
    scopes.push(scope)
    return scope
  }
  const headHookCallbacks = new Map<string, Array<(ctx: any) => void>>()
  const head = {
    hooks: {
      hook: vi.fn((name: string, callback: (ctx: any) => void) => {
        const callbacks = headHookCallbacks.get(name) || []
        callbacks.push(callback)
        headHookCallbacks.set(name, callbacks)
        return vi.fn(() => {
          const index = callbacks.indexOf(callback)
          if (index !== -1)
            callbacks.splice(index, 1)
        })
      }),
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
    coreUseScript: vi.fn(),
    createScope,
    head,
    headHookCallbacks,
    scopes,
    shared,
    vueUseScript: vi.fn(),
  }
})

vi.mock('@unhead/vue/scripts', () => ({
  useScript: mocks.vueUseScript,
}))

vi.mock('unhead/scripts', () => ({
  useScript: mocks.coreUseScript,
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
    mocks.headHookCallbacks.clear()
    mocks.scopes.length = 0
    Object.assign(mocks.shared, {
      id: 'https://example.com/sdk.js',
      status: 'awaitingLoad',
      _statusRef: { value: 'awaitingLoad' },
      signal: new AbortController().signal,
      entry: undefined,
      load: mocks.baseLoad,
      remove: mocks.baseRemove,
    })
    delete mocks.shared.reload
    delete mocks.shared.toJSON
    for (const symbol of Object.getOwnPropertySymbols(mocks.shared))
      delete mocks.shared[symbol]
    mocks.vueUseScript.mockImplementation(() => mocks.createScope())
  })

  it('returns a consumer scope while retaining a component-free app facade', () => {
    const first = useScript('https://example.com/sdk.js')
    const decoratedRemove = first.remove
    const second = useScript('https://example.com/sdk.js')
    const appInstance = mocks.app.$scripts['https://example.com/sdk.js']

    expect(mocks.vueUseScript).toHaveBeenCalledTimes(2)
    expect(mocks.vueUseScript.mock.calls[0]?.[1]).toMatchObject({ scope: true })
    expect(first).not.toBe(second)
    expect(first.script).toBe(mocks.shared)
    expect(second.script).toBe(mocks.shared)
    expect(second.remove).toBe(decoratedRemove)
    expect(appInstance).not.toBe(first)
    expect(appInstance.script).toBe(mocks.shared)
    expect(appInstance.status).toBe(first.status)

    first.dispose()

    expect(mocks.baseRemove).not.toHaveBeenCalled()
    expect(mocks.app.$scripts).toHaveProperty('https://example.com/sdk.js')
  })

  it('removes the shared resource and app registry entry globally', () => {
    const instance = useScript('https://example.com/sdk.js')

    expect(instance.remove()).toBe(true)
    expect(mocks.baseRemove).toHaveBeenCalledOnce()
    expect(mocks.app.$scripts).not.toHaveProperty('https://example.com/sdk.js')
  })

  it('removes the shared resource during app teardown', () => {
    useScript('https://example.com/sdk.js')

    mocks.appHookCallbacks.get('app:unmount')?.[0]?.()

    expect(mocks.baseRemove).toHaveBeenCalledOnce()
    expect(mocks.app.$scripts).not.toHaveProperty('https://example.com/sdk.js')
  })

  it('keeps the app facade and public status ref live across reloads', async () => {
    const reloaded = {
      id: 'reload-script',
      status: 'loading',
      signal: new AbortController().signal,
      entry: { dispose: vi.fn() },
      load: vi.fn(async () => {
        reloaded.status = 'loaded'
        for (const callback of mocks.headHookCallbacks.get('script:updated') || [])
          callback({ script: reloaded })
        return { ready: true }
      }),
      remove: vi.fn(() => true),
    }
    mocks.coreUseScript.mockReturnValue(reloaded as any)
    const instance = useScript('https://example.com/sdk.js')
    const appInstance = mocks.app.$scripts['https://example.com/sdk.js']
    const status = instance.status

    await expect(instance.reload()).resolves.toEqual({ ready: true })

    expect(instance.status).toBe(status)
    expect(status.value).toBe('loaded')
    expect(instance.entry).toBe(reloaded.entry)
    expect(appInstance.script).toBe(reloaded)
    expect(appInstance.signal).toBe(reloaded.signal)
    expect(reloaded.load).toHaveBeenCalledOnce()
    expect(mocks.coreUseScript).toHaveBeenCalledWith(
      mocks.head,
      expect.objectContaining({ key: expect.stringContaining('https://example.com/sdk.js-') }),
      expect.objectContaining({ scope: false, trigger: 'client' }),
    )
  })

  it('does not bypass validation when reload is called', async () => {
    const validationError = { issues: [{ message: 'invalid test options' }] }
    const instance = useScript('https://example.com/sdk.js', {
      _validate: () => validationError,
    } as any)

    await expect(instance.reload()).rejects.toBe(validationError)
    expect(mocks.baseRemove).not.toHaveBeenCalled()
    expect(mocks.coreUseScript).not.toHaveBeenCalled()
  })
})
