import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNpmScriptStub } from '../../packages/script/src/runtime/npm-script-stub'

vi.mock('../../packages/script/src/runtime/logger', () => ({
  logger: { error: vi.fn() },
}))

describe('npm script stub lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not retain callbacks registered after initialization fails', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const beforeFailure = vi.fn()
    const afterFailure = vi.fn()
    const stub = createNpmScriptStub({
      key: 'failing-script',
      clientInit: () => Promise.reject(new Error('initialization failed')),
    })

    stub.onLoaded(beforeFailure)
    await stub.load()
    stub.onLoaded(afterFailure)
    await stub.load()

    expect(stub.status.value).toBe('error')
    expect(beforeFailure).not.toHaveBeenCalled()
    expect(afterFailure).not.toHaveBeenCalled()
  })

  it('releases callbacks and trigger resources when disposed', () => {
    const cleanup = vi.fn()
    const callback = vi.fn()
    const stub = createNpmScriptStub({
      key: 'scoped-script',
      trigger: vi.fn(() => cleanup),
    })
    stub.onLoaded(callback)

    stub.dispose()

    expect(stub.signal.aborted).toBe(true)
    expect(stub.status.value).toBe('removed')
    expect(cleanup).toHaveBeenCalledOnce()
    expect(stub.remove()).toBe(false)
    expect(stub.script).toBe(stub)
  })

  it('does not revive a disposed stub when asynchronous initialization settles', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const initialization = Promise.withResolvers<void>()
    const callback = vi.fn()
    const stub = createNpmScriptStub({
      key: 'slow-script',
      clientInit: () => initialization.promise,
      trigger: 'manual',
    })
    stub.onLoaded(callback)

    const loading = stub.load()
    expect(stub.status.value).toBe('loading')
    stub.dispose()
    initialization.resolve()
    await loading

    expect(stub.status.value).toBe('removed')
    expect(callback).not.toHaveBeenCalled()
  })
})
