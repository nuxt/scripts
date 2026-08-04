/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attachUsercentricsConsent } from '../../packages/script/src/runtime/registry/usercentrics'

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))
vi.mock('nuxt/app', () => ({ useNuxtApp: vi.fn() }))
vi.mock('../../packages/script/src/runtime/utils', () => ({ useRegistryScript: vi.fn() }))

const mocks = vi.hoisted(() => {
  const remove = vi.fn(() => true)
  const load = vi.fn(() => Promise.resolve({}))
  const shared: any = { load, remove }
  return {
    hook: vi.fn((_name: string, _callback: () => void) => vi.fn()),
    load,
    remove,
    shared,
  }
})

describe('usercentrics lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.shared.load = mocks.load
    mocks.shared.remove = mocks.remove
    delete mocks.shared.consent
  })

  afterEach(() => {
    delete window.__ucCmp
  })

  it('re-arms readiness after remove and load', async () => {
    const instance = mocks.shared
    attachUsercentricsConsent(instance, window, callback => mocks.hook('app:unmount', callback))
    const initialWait = instance.consent.whenReady()

    instance.remove()
    await expect(initialWait).rejects.toThrow('aborted')

    const api = { isInitialized: vi.fn(() => Promise.resolve(true)) }
    window.__ucCmp = api as any
    await instance.load()

    await expect(instance.consent.whenReady()).resolves.toBe(api)
    expect(mocks.hook).toHaveBeenCalledTimes(2)
  })
})
