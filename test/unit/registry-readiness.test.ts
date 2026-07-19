/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptCrisp } from '../../packages/script/src/runtime/registry/crisp'
import { useScriptGoogleMaps } from '../../packages/script/src/runtime/registry/google-maps'
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
    mocks.useRegistryScript.mockImplementation((key, factory) => {
      const options = {
        crisp: { id: 'website-id' },
        googleMaps: { apiKey: 'maps-key' },
        usercentrics: { rulesetId: 'ruleset-id' },
      }[key as 'crisp' | 'googleMaps' | 'usercentrics']
      const definition = factory(options || {})
      mocks.definitions.set(key, definition)
      return {
        status: ref('awaitingLoad'),
        signal: new AbortController().signal,
        load: vi.fn(),
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
})
