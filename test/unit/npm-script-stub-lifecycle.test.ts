import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { createNpmScriptStub } from '../../packages/script/src/runtime/npm-script-stub'

const mocks = vi.hoisted(() => ({
  loggerError: vi.fn(),
}))

vi.mock('../../packages/script/src/runtime/logger', () => ({
  logger: { error: mocks.loggerError },
}))

vi.mock('nuxt/app', () => ({
  onNuxtReady: vi.fn(),
}))

describe('npm script stub lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mocks.loggerError.mockReset()
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

  it('disposes with its owning Vue scope', () => {
    const cleanup = vi.fn()
    const scope = effectScope()
    const stub = scope.run(() => createNpmScriptStub({
      key: 'scoped-script',
      trigger: vi.fn(() => cleanup),
    }))!

    scope.stop()

    expect(stub.signal.aborted).toBe(true)
    expect(stub.status.value).toBe('removed')
    expect(cleanup).toHaveBeenCalledOnce()
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

  it('reports rejected asynchronous custom triggers', async () => {
    const error = new Error('trigger failed')
    const triggerResult = {
      then: vi.fn((_resolve: () => void, reject?: (reason: unknown) => void) => {
        reject?.(error)
      }),
    }

    createNpmScriptStub({
      key: 'rejected-trigger',
      trigger: vi.fn(() => triggerResult) as any,
    })

    await vi.waitFor(() => {
      expect(mocks.loggerError).toHaveBeenCalledWith(
        '[NpmScriptStub] Trigger failed for rejected-trigger:',
        error,
      )
    })
  })
})
