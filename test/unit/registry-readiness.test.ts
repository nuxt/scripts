/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptCrisp } from '../../packages/script/src/runtime/registry/crisp'
import { useScriptGoogleMaps } from '../../packages/script/src/runtime/registry/google-maps'
import { useScriptTawkTo } from '../../packages/script/src/runtime/registry/tawk-to'
import { useScriptUsercentrics } from '../../packages/script/src/runtime/registry/usercentrics'

const mocks = vi.hoisted(() => ({
  definitions: new Map<string, any>(),
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

function createResolverWait() {
  let cleanup: void | (() => void)
  const waitFor = <T>(setup: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void | (() => void)) => new Promise<T>((outerResolve, outerReject) => {
    const resolve = (value: T) => {
      cleanup?.()
      outerResolve(value)
    }
    const reject = (reason?: unknown) => {
      cleanup?.()
      outerReject(reason)
    }
    cleanup = setup(resolve, reject)
  })
  return {
    waitFor,
    cleanup: () => cleanup?.(),
  }
}

describe('registry script readiness resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.definitions.clear()
    delete (window as any).google
    delete (window as any).$crisp
    delete window.CRISP_READY_TRIGGER
    delete window.__ucCmp
    delete window.Tawk_API
    mocks.useRegistryScript.mockImplementation((key, factory) => {
      const options = {
        crisp: { id: 'website-id' },
        googleMaps: { apiKey: 'maps-key' },
        usercentrics: { rulesetId: 'ruleset-id' },
        tawkTo: { propertyId: 'test-property', widgetId: 'test-widget' },
      }[key as 'crisp' | 'googleMaps' | 'usercentrics' | 'tawkTo']
      const definition = factory(options || {})
      mocks.definitions.set(key, definition)
      return {
        status: ref('awaitingLoad'),
        signal: new AbortController().signal,
        load: vi.fn(),
        proxy: new Proxy({}, { get: () => () => {} }),
      }
    })
  })

  it('resolves Google Maps from its callback and restores any previous handler', async () => {
    const previousReady = vi.fn()
    const maps = { __ib__: previousReady } as any
    ;(window as any).google = { maps }
    useScriptGoogleMaps({ apiKey: 'maps-key' })
    const resolver = createResolverWait()
    const apiPromise = mocks.definitions.get('googleMaps').scriptOptions.resolve(resolver)
    const installedReady = maps.__ib__

    installedReady()

    await expect(apiPromise).resolves.toEqual({ maps })
    expect(previousReady).toHaveBeenCalledOnce()
    expect(maps.__ib__).toBe(previousReady)
  })

  it('resolves Crisp to the concrete SDK API after CRISP_READY_TRIGGER', async () => {
    const previousReady = vi.fn()
    window.CRISP_READY_TRIGGER = previousReady
    ;(window as any).$crisp = []
    useScriptCrisp({ id: 'website-id' })
    const resolver = createResolverWait()
    const apiPromise = mocks.definitions.get('crisp').scriptOptions.resolve(resolver)
    const installedReady = window.CRISP_READY_TRIGGER
    const api = { push: vi.fn(), is: vi.fn() }
    ;(window as any).$crisp = api

    installedReady?.()

    await expect(apiPromise).resolves.toBe(api)
    expect(previousReady).toHaveBeenCalledOnce()
    expect(window.CRISP_READY_TRIGGER).toBe(previousReady)
  })

  it('resolves Usercentrics from UC_CMP_API_READY and releases the listener', async () => {
    const api = { isInitialized: vi.fn(async () => false) } as any
    window.__ucCmp = api
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    useScriptUsercentrics({ rulesetId: 'ruleset-id' })
    const resolver = createResolverWait()
    const apiPromise = mocks.definitions.get('usercentrics').scriptOptions.resolve(resolver)

    window.dispatchEvent(new CustomEvent('UC_CMP_API_READY'))

    await expect(apiPromise).resolves.toEqual({ ucCmp: api })
    expect(removeEventListener).toHaveBeenCalledWith('UC_CMP_API_READY', expect.any(Function))
  })

  it('resolves Tawk.to from the tawkLoad window event', async () => {
    const api = {
      onLoaded: undefined,
      isChatHidden: vi.fn(() => false),
      isChatMinimized: vi.fn(() => false),
      isChatMaximized: vi.fn(() => false),
      getStatus: vi.fn(() => 'online'),
    } as any
    window.Tawk_API = api
    useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })
    const resolver = createResolverWait()
    const apiPromise = mocks.definitions.get('tawkTo').scriptOptions.resolve(resolver)

    window.dispatchEvent(new CustomEvent('tawkLoad'))

    await expect(apiPromise).resolves.toBe(api)
  })

  // The shipped embed script writes `window.Tawk_API.onLoaded = !0` (boolean
  // true), not the number 1 - the fast path must honor the real value.
  it('resolves Tawk.to immediately when already loaded (onLoaded === true)', () => {
    const api = { onLoaded: true } as any
    window.Tawk_API = api
    useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })
    const result = mocks.definitions.get('tawkTo').scriptOptions.resolve(createResolverWait())

    expect(result).toBe(api)
  })

  it('warns when setVisitor is called after the widget has loaded (onLoaded === true)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const api = { onLoaded: true } as any
    window.Tawk_API = api
    const instance = useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })

    instance.setVisitor({ name: 'Jane Doe' })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setVisitor'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('before the widget script is inserted'))
    expect(api.visitor).toBeUndefined()
    warn.mockRestore()
  })

  it('creates the Tawk_API stub and assigns visitor when setVisitor is called before clientInit', () => {
    const instance = useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })

    instance.setVisitor({ name: 'Jane' })

    expect(window.Tawk_API).toBeDefined()
    expect(window.Tawk_API!.visitor).toEqual({ name: 'Jane' })
  })

  // clientInit installs a bare `{}` Tawk_API stub; the getters must degrade to
  // undefined/false instead of throwing TypeError on the missing methods.
  it('returns undefined/false from every getter while only the Tawk_API stub exists', () => {
    window.Tawk_API = {} as any
    const instance = useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })

    expect(instance.getWindowType()).toBeUndefined()
    expect(instance.getStatus()).toBeUndefined()
    expect(instance.isChatMaximized()).toBe(false)
    expect(instance.isChatMinimized()).toBe(false)
    expect(instance.isChatHidden()).toBe(false)
    expect(instance.isChatOngoing()).toBe(false)
    expect(instance.isVisitorEngaged()).toBe(false)
    expect(instance.widgetPosition()).toBeUndefined()
  })

  // Tawk fires `tawkChatHidden` on hide but no matching event on show, so the
  // ref must resynchronize when a visibility command runs.
  it('resets isHidden when a visibility command runs after the widget was hidden', () => {
    window.Tawk_API = { isChatHidden: vi.fn(() => false) } as any
    const instance = useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })

    window.dispatchEvent(new CustomEvent('tawkChatHidden'))
    expect(instance.isHidden.value).toBe(true)

    instance.proxy.showWidget()
    expect(instance.isHidden.value).toBe(false)
  })

  // Runs last: clientInit flips the module-level embed-requested cutoff that
  // setVisitor warns past, and no code resets it within a page (or test file).
  it('warns and drops setVisitor once the embed script has been inserted, even before onLoaded', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const instance = useScriptTawkTo({ propertyId: 'test-property', widgetId: 'test-widget' })
    // clientInit runs immediately before the embed script tag is injected;
    // after it, Tawk no longer honors `Tawk_API.visitor` writes.
    mocks.definitions.get('tawkTo').clientInit?.()
    expect(window.Tawk_API!.onLoaded).toBeUndefined()

    instance.setVisitor({ name: 'Jane Doe' })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setVisitor'))
    expect(window.Tawk_API!.visitor).toBeUndefined()
    warn.mockRestore()
  })
})
